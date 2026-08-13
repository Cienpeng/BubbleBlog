import './env';
import sql from './db/connection';
import { createUser, getUserByUsername } from './db/queries/users';

async function main() {
  const existing = await getUserByUsername('admin');
  if (existing) {
    throw new Error('Admin user already exists');
  }

  // Read from stdin to keep the password out of shell history and process args.
  // Example: printf '%s' "$ADMIN_PASSWORD" | bun run admin:setup
  const password = (await Bun.stdin.text()).trim();
  if (password.length < 12 || password.length > 128) {
    throw new Error('Initial password must be between 12 and 128 characters');
  }

  const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
  await createUser('admin', hash);
  console.log('Admin user created successfully');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Failed to create admin user');
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
