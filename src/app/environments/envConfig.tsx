export default class EnvConfig {
    front_api = import.meta.env.VITE_FRONT_API;
    login_page = import.meta.env.VITE_LOGIN_PAGE
    middle_token_api = import.meta.env.VITE_MIDDLE_TOKEN_API;
    logout_token_api = import.meta.env.VITE_LOGOUT_TOKEN_API;
}