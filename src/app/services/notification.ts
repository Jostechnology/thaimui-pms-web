import { front_api } from "./apiConfig";

export async function subscribeUser(subscriptionData: any) {
	const response = await front_api("POST", `/subscribe`, subscriptionData, {wrapData : false})
	return response;
}

export async function unsubscribeUser(subscriptionData: any) {
	const response = await front_api("POST", `/unsubscribe`, subscriptionData, {wrapData : false})
}
export async function getVapidPublicKeyService() {
	
	const res = await front_api("POST", `/vapid-public-key`, {}) 
	return res;
}

//--------- NOTIFICATION SETTING ---------//

export async function getNotificationSetting() {
	try {
		
		const res = await front_api("POST", `/notification_setting/get`, {}) 
		if (res == false) {
			return false
		}
		const data = await res.json()
		return data;
	} catch (err) {
		return false;
	}
}

export async function getNotificationHistory(page : number) {
	try {
		const body = {
			page : page,
			per_page : 10
		}
		const res = await front_api("POST", `/notification_history/get`, body) 
		if (res == false) {
			return false
		}
		const data = await res.json()
		return data;
	} catch (err) {
		return false;
	}
}

export async function editNotificationSetting(data : any) {
	try {
		const res = await front_api("POST", `/notification_setting/get`, data) 
		if (res == false) {
			return false
		}
		const response = await res.json()
		return response;
	} catch (err) {
		return false;
	}
}
