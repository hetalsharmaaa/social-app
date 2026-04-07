import Cookies from "js-cookie";

export const saveToken = (token: string) => {
  Cookies.set("token", token, { expires: 7 });
};

export const getToken = () => Cookies.get("token");

export const logout = () => {
  Cookies.remove("token");
  window.location.href = "/login";
};