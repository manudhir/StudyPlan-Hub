import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainText: string): Promise<string> => {
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

export const comparePassword = async (
  plainText: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainText, hashedPassword);
};
