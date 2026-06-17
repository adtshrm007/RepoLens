import validator from "validator";

export const isValidEmail = (email) => {
  return validator.isEmail(email);
};

export const isStrongPassword = (password) => {
  return validator.isStrongPassword(password);
};

export const isValidName = (name) => {
  return name.length >= 4;
};
