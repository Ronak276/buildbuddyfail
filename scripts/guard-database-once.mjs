import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnvValue(name) {
  if (process.env[name]) return process.env[name].trim();
  if (fs.existsSync(".env")) {
    const env = fs.readFileSync(".env", "utf8");
    const match = env.match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, "m"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

const url = loadEnvValue("SUPABASE_URL");
const key = loadEnvValue("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runOnce() {
  let deleted = 0;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) {
      console.error("Failed to list users:", error.message);
      process.exit(1);
    }
    const users = data?.users || [];
    if (users.length === 0) break;

    for (const user of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.warn(`Failed to delete ${user.email || user.id}: ${delErr.message}`);
      } else {
        deleted++;
        console.log(`[BLOCKED & DELETED] ${user.email || user.id}`);
      }
    }
  }
  console.log(`Guard check complete. Users deleted: ${deleted}`);
}

runOnce();
