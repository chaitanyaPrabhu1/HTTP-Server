import express, { NextFunction } from "express";
import { Request, Response } from "express";
import { config } from "./config.js";

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, deleteUsers, getUserByEmail, updateUser, upgradeUserToChirpyRed } from "./db/queries/users.js";
import { createChirp, deleteChirp, getAllChirps, getChirp, getChirpsByAuthor } from "./db/queries/chirps.js";
import { hashPassword, checkPasswordHash, makeJWT, getBearerToken, validateJWT, makeRefreshToken, getAPIKey } from "./auth.js";
import { getUserFromRefreshToken, revokeRefreshToken, saveRefreshToken } from "./db/queries/refresh_tokens.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "./errors.js";

const ONE_HOUR_IN_SECOND = 60*60;
const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// middleware
app.use(express.json());
app.use(middlewareLogResponse);

// get request
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerMetrics);
app.get("/api/chirps", handlerChirpsGet);
app.get("/api/chirps/:chirpId", handlerChirpGet);
app.post("/admin/reset", handlerReset);
app.post("/api/users", userCreation);
app.post("/api/chirps", handlerChirpsCreate);
app.post("/api/login", handlerLogin);
app.post("/api/refresh", handlerRefresh);
app.post("/api/revoke", handlerRevoke);
app.post("/api/polka/webhooks", handlerPolkaWebhook);
app.put("/api/users", handlerUserUpdate);
app.delete("/api/chirps/:chirpId", handlerChirpsDelete);
app.use(errorHandler);

// checks for the new migration files, before running the server
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

//-------------------------------------------------------------------------------



//--------------------------------------------------------------------------------

function handlerReadiness(req: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8").send("OK");
}

function handlerMetrics(req: Request, res: Response) {
  res
    .set("Content-Type", "text/html; charset=utf-8")
    .send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
}

async function handlerReset(req: Request, res: Response) {
  config.api.fileserverHits = 0;
  await deleteUsers();
  res.set("Content-Type", "text/plain; charset=utf-8").send("Hits reset to 0");
}

function middlewareLogResponse(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode > 299) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }
  });
  next();
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.api.fileserverHits++;
  next();
}

function cleanBody(body: string): string {
  const profane = new Set(["kerfuffle", "sharbert", "fornax"]);
  const words = body.split(" ");
  const cleaned = words.map((word) =>
    profane.has(word.toLowerCase()) ? "****" : word
  );
  return cleaned.join(" ");
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.log(err.message);

  let statusCode = 500;
  if (err instanceof BadRequestError) {
    statusCode = 400;
  } else if (err instanceof UnauthorizedError) {
    statusCode = 401;
  } else if (err instanceof ForbiddenError) {
    statusCode = 403;
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
  }

  res.status(statusCode).json({ error: err.message });
}

async function userCreation(req: Request, res: Response, next: NextFunction) {
  type format = {
    email: string;
    "password": string;
  };

  try {
    const param: format = req.body;
    if (!param.email || !param.password) {
      throw new BadRequestError("Missing required field");
    }

    const hashedPassword = await hashPassword(param.password);
    const user = await createUser({ email: param.email, hashedPassword });

    if (!user) {
      throw new Error("Could not create user");
    }

    const { hashedPassword: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
}

async function handlerChirpsCreate(req: Request, res: Response, next: NextFunction) {
  type parameters = {
    body: string;
  };
  try {
    const param: parameters = req.body;

    const token = getBearerToken(req);
    const userId = validateJWT(token, config.jwt.secret);

    if (param.body.length > 140) {
      throw new BadRequestError("Chirp is too long. Max length is 140");
    }
    const cleaned = cleanBody(param.body);
    const chirp = await createChirp({ body: cleaned, userId: userId });
    if (!chirp) {
      throw new Error("Could not create chirp");
    }
    res.status(201).json(chirp);
  } catch (error) {
    next(error);
  }
}



async function handlerChirpGet(req: Request, res: Response, next: NextFunction) {
  try {
    const chirpId = req.params.chirpId as string;
    const chirp = await getChirp(chirpId);
    if (!chirp) {
      throw new NotFoundError("Chirp not found");
    }
    res.status(200).json(chirp);
  } catch (error) {
    next(error);
  }
}






async function handlerLogin(req: Request, res: Response, next: NextFunction) {
  type format = {
    email: string;
    password: string;
  };
  try {
    const param: format = req.body;
    if (!param.email || !param.password) {
      throw new BadRequestError("Missing required field");
    }
    const user = await getUserByEmail(param.email);
    if (!user) {
      throw new UnauthorizedError("incorrect email or password");
    }
    const matches = await checkPasswordHash(param.password, user.hashedPassword);
    if (!matches) {
      throw new UnauthorizedError("incorrect email or password");
    }

    const token = makeJWT(user.id, ONE_HOUR_IN_SECOND, config.jwt.secret);

    const refreshToken = makeRefreshToken();
    const sixtyDaysMs = 1000 * 60 * 60 * 24 * 60;
    await saveRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + sixtyDaysMs),
    });

    const { hashedPassword: _, ...safeUser } = user;
    res.status(200).json({ ...safeUser, token, refreshToken });
  } catch (error) {
    next(error);
  }
}


async function handlerRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    const user = await getUserFromRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedError("Invalid refresh token");
    }
    const token = makeJWT(user.id, ONE_HOUR_IN_SECOND, config.jwt.secret);
    res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
}



async function handlerRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}


async function handlerUserUpdate(req:Request, res:Response, next:NextFunction) {
  type parameters = {
    email: string;
    password: string;
  };

  try{
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.jwt.secret);

    const param: parameters = req.body;

    if(!param.email || !param.password){
      throw new BadRequestError("Missing required body");
    }

    const hashedPassword = await hashPassword(param.password);

    const updated = await updateUser(userId, param.email, hashedPassword);

    const {hashedPassword: _, ...safeUser} = updated;
    res.status(200).json(safeUser);
  }catch(error){
    next(error);
  }
}




async function handlerChirpsDelete(req: Request, res: Response, next: NextFunction){
  try{
    const token = getBearerToken(req);
    const userId = validateJWT(token, config.jwt.secret);


    const chirpId = req.params.chirpId as string;


    const chirp = await getChirp(chirpId);
    if(!chirp){
      throw new NotFoundError("Chirp not fonud");
    }


    if(chirp.userId !== userId){
      throw new ForbiddenError("You can only delete your own chirp");
    }



    await deleteChirp(chirpId);
    res.status(204).send();
  }catch(error){
    next(error);
  }
}

async function handlerPolkaWebhook(req: Request, res: Response, next: NextFunction) {
  type parameters = {
    event: string;
    data: {
      userId: string;
    };
  };
  try {
    // NEW: verify the request is really from Polka
    const apiKey = getAPIKey(req);
    if (apiKey !== config.api.polkaKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    const param: parameters = req.body;

    if (param.event !== "user.upgraded") {
      res.status(204).send();
      return;
    }

    const user = await upgradeUserToChirpyRed(param.data.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}




async function handlerChirpsGet(req: Request, res: Response, next: NextFunction) {
  try {
    // authorId from the previous lesson
    let authorId = "";
    const authorIdQuery = req.query.authorId;
    if (typeof authorIdQuery === "string") {
      authorId = authorIdQuery;
    }

    // NEW: sort direction, default "asc"
    let sortDirection = "asc";
    const sortQuery = req.query.sort;
    if (sortQuery === "desc") {
      sortDirection = "desc";
    }

    // Fetch (filtered or all) as before
    let chirps;
    if (authorId !== "") {
      chirps = await getChirpsByAuthor(authorId);
    } else {
      chirps = await getAllChirps();
    }

    // NEW: sort in-memory by createdAt
    chirps.sort((a, b) =>
      sortDirection === "asc"
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime(),
    );

    res.status(200).json(chirps);
  } catch (error) {
    next(error);
  }
}
