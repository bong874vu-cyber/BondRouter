import dotenv from 'dotenv'
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

dotenv.config()

async function testCircle() {
  const apiKey = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET

  console.log("=== CIRCLE INTEGRATION TEST ===")
  console.log("CIRCLE_API_KEY configured:", apiKey ? "YES (masked)" : "NO")
  console.log("CIRCLE_ENTITY_SECRET configured:", entitySecret ? "YES (masked)" : "NO")

  if (!apiKey) {
    console.error("Error: CIRCLE_API_KEY is not defined in your .env file.")
    process.exit(1)
  }

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
      entitySecret: entitySecret || "0000000000000000000000000000000000000000000000000000000000000000" // fallback placeholder for listing
    })

    console.log("\nAttempting to query wallet sets from Circle Sandbox...")
    const sets = await client.listWalletSets()
    console.log("Wallet Sets Found:", sets.data?.walletSets?.length || 0)
    if (sets.data?.walletSets) {
      sets.data.walletSets.forEach(set => {
        console.log(`- Set Name: ${set.name}, ID: ${set.id}`)
      })
    }

    console.log("\nCircle Developer-Controlled Wallets test completed successfully.")
  } catch (e) {
    console.error("\nCircle SDK Query failed:", e.message)
    console.log("Verify your API key is active and matches the Circle Sandbox environment.")
  }
}

testCircle()
