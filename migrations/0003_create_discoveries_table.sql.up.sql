CREATE TABLE "discoveries" (
    "number"     bigint PRIMARY KEY REFERENCES "elements"("number"),
    "year"       text NOT NULL,
    "discoverer" text NOT NULL
);
