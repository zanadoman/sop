CREATE TABLE "stability" (
    "number" bigint REFERENCES "elements"("number"),
    "mass"   bigint,
    PRIMARY KEY ("number", "mass")
);
