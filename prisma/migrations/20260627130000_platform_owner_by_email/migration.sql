-- Make the platform owner deterministic: exactly the founder's login account
-- (the email used to administer the platform). Supersedes the "oldest user"
-- heuristic from the previous migration. Adjust the email to add/move owners.
UPDATE "User" SET "platformAdmin" = ("email" = 'shadziaganovic@gmail.com');
