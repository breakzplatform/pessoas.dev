// Seeds a local development database with a few sample handles.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const SAMPLES = [
  {
    handle: "exemplo",
    did: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
    domain: "pessoas.dev",
  },
  {
    handle: "exemplo",
    did: "did:plc:z72i7hdynmk6r22z27h6tvur",
    domain: "ceuazul.online",
  },
]

async function main() {
  for (const { handle, did, domain } of SAMPLES) {
    await prisma.user.create({
      data: {
        did,
        handle,
        domain: {
          connectOrCreate: {
            where: { name: domain },
            create: { name: domain },
          },
        },
      },
    })
    console.log("Added", `${handle}.${domain}`, did)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
