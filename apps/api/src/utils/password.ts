import bcrypt from "bcrypt";

export async function encryptPassword(password: string) {
  return await bcrypt.hash(password, 12);
}

export async function matchPasswords(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}