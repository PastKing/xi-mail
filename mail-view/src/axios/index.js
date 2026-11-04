import axios from "axios";
import router from "@/router";
import i18n from "@/i18n/index.js";
import {useSettingStore} from "@/store/setting.js";
import {useServerStore} from "@/store/server.js";

const instanceCache = new Map()

function applyInterceptors(instance, serverId) {
    instance.interceptors.request.use(config => {
        const { lang } = useSettingStore();
        const serverStore = useServerStore();
        config.headers.Authorization = serverStore.getToken(serverId)
        config.headers['accept-language'] = lang
        return config
    })

    instance.interceptors.response.use((res) => {
        return new Promise((resolve, reject) => {
            const noMsg = res.config.noMsg;
            const data = res.data

            if (noMsg) {
                data.code === 200 ? resolve(data.data) : reject(data)
            } else if (data.code === 401) {
                ElMessage({
                    message: data.message,
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                })
                const serverStore = useServerStore();
                serverStore.clearToken(serverId)
                if (!serverStore.isStandalone) {
                    localStorage.removeItem('token')
                }
                router.replace('/login')
                reject(data)
            } else if (data.code === 403) {
                ElMessage({
                    message: data.message,
                    type: 'warning',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                })
                reject(data)
            } else if (data.code === 502) {
                ElMessage({
                    dangerouslyUseHTMLString: true,
                    message: data.message,
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                })
                reject(data)
            } else if (data.code !== 200) {
                ElMessage({
                    message: data.message,
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                })
                reject(data)
            }
            resolve(data.data)
        })
    },
    (error) => {
        if (error.status === 403) {
            location.reload();
            return;
        }

        const noMsg = error.config?.noMsg;

        if (noMsg) {
            return Promise.reject(error)
        } else if (error.response?.status === 429) {
            ElMessage({ message: error.response.data?.message || i18n.global.t('reqFailErrorMsg'), type: 'warning', plain: true, grouping: true })
        } else if (error.message?.includes('Network Error')) {
            ElMessage({
                message: i18n.global.t('networkErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            })
        } else if (error.code === 'ECONNABORTED') {
            ElMessage({
                message: i18n.global.t('timeoutErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true
            })
        } else if (error.response) {
            ElMessage({
                message: i18n.global.t('serverBusyErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            })
        } else {
            ElMessage({
                message: i18n.global.t('reqFailErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            })
        }
        return Promise.reject(error)
    })

    return instance
}

function getOrCreateInstance(serverId, baseURL) {
    const key = serverId + '|' + baseURL
    if (instanceCache.has(key)) return instanceCache.get(key)
    const instance = axios.create({ baseURL })
    applyInterceptors(instance, serverId)
    instanceCache.set(key, instance)
    return instance
}

export function getHttp(serverId) {
    const serverStore = useServerStore();
    if (serverId) {
        const server = serverStore.servers.find(s => s.id === serverId)
        if (server) return getOrCreateInstance(server.id, server.url)
    }
    const active = serverStore.activeServer
    if (active) return getOrCreateInstance(active.id, active.url)
    return getOrCreateInstance('fallback', import.meta.env.VITE_BASE_URL || '/api')
}

export function getHttpForServer(serverId) {
    return getHttp(serverId)
}

export function clearInstanceCache() {
    instanceCache.clear()
}

const http = new Proxy({}, {
    get(_, prop) {
        return getHttp()[prop]
    }
})

export default http
