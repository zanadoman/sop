CREATE TABLE "elements" (
    "number"    bigint PRIMARY KEY,
    "name"      text NOT NULL,
    "symbol"    text NOT NULL,
    "mass"      bigint NOT NULL,
    "synthetic" boolean NOT NULL,
    "melting"   bigint,
    "boiling"   bigint
);
