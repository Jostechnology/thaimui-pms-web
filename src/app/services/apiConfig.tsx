import EnvConfig from "../environments/envConfig";
import axios from "axios";
import { getTokenFromLocal, getTokenRefresh, giveAccessDenied } from "../helpers/appHelpers";
import { authTokenDedicated, isTokenExpired } from "../helpers/authenticationHelpers";
import { refresh } from "./dedicated_auth";

const env = new EnvConfig();

export const middle_token_api = axios.create({
	baseURL: env.middle_token_api,
	headers: {
		"Content-Type": "application/json",
	},
});

interface ApiOptions {
	wrapData?: boolean;
	headers?: Record<string, string>;
	name?: "data" | "payload";
}

export const front_api = async (
	method: "GET" | "POST" | "PUT" | "DELETE",
	path: string,
	data?: any,
	options: ApiOptions = {}
) => {
	try {
		if (isTokenExpired() && path !== "/login" && path !== "/register") {
			const refresh_token = getTokenRefresh();
			if (!refresh_token) {
				giveAccessDenied();
				return;
			}

			const res = await refresh(refresh_token);
			if (!res || res.status !== 200) {
				console.error("Can't refresh token");
				giveAccessDenied(true);
				return;
			}

			const data = await res.json();
			if (data.success) {
				const result = authTokenDedicated(data.access_token, data.refresh_token);
				if (!result) {
					giveAccessDenied(true);
					return;
				}
			}
		}
		const { wrapData = true, headers = {}, name = "data" } = options;

		let body: any;

		if (method === "GET") {
			body = undefined;
		} else {
			if (wrapData) {
				body = JSON.stringify({
					[name]: data,
					token: getTokenFromLocal(),
				});
			} else {
				body = JSON.stringify({
					...data,
					...(path !== "/verify_token" ? { token: getTokenFromLocal() } : {}),
				});
			}
		}

		const res = await fetch(`${env.front_api}${path}`, {
			method: method,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: body,
		});

		return res;
	} catch (error) {
		console.error(`API Error [${method} ${path}]:`, error);
		return false;
	}
};
 

// export const front_api = axios.create({
//     baseURL: env.front_api
// })

// /**
//  * Convenience wrapper for legacy API endpoints (no data wrapping)
//  */
// export const front_api_legacy = async (
// 	method: "GET" | "POST" | "PUT" | "DELETE",
// 	path: string,
// 	data?: any,
// 	options: ApiOptions = {}
// ) => {
// 	return front_api(method, path, data, { ...options, wrapData: false });
// };
