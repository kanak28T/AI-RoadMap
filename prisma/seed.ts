import { getPrisma } from "../lib/db/prisma";

async function main() {
  const prisma = getPrisma();

  await prisma.user.upsert({
    where: { email: "guest@pathcraft.ai" },
    update: {},
    create: { email: "guest@pathcraft.ai", name: "Guest" },
  });

  console.log("Seed complete");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
