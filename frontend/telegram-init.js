import { apiTelegramLogin } from "./api.js";

export async function telegramLogin(){
    return new Promise(async resolve => {
        if(!window.Telegram || !Telegram.WebApp){
            alert("Run inside Telegram Mini App!");
            resolve(null);
            return;
        }

        const initData = Telegram.WebApp.initData;
        const res = await apiTelegramLogin(initData);

        if(res && res.token){
            localStorage.setItem("token", res.token);
            localStorage.setItem("userName", res.user.name);
            resolve(res.user);
        } else {
            resolve(null);
        }
    });
}
