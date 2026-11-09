import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore();
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale(settingStore.lang === 'en' ? 'en' : 'zh-cn')
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function fromNow(date) {
    const d = dayjs.utc(date).tz(timeZone);
    const now = dayjs();
    const diffSeconds = now.diff(d, 'second');
    const diffMinutes = now.diff(d, 'minute');
    const diffHours = now.diff(d, 'hour');
    const isToday = now.isSame(d, 'day');
    if (settingStore.lang && settingStore.lang !== 'zh') {
        const lang=settingStore.lang;
        if(isToday){
            const relative=new Intl.RelativeTimeFormat(lang,{numeric:'auto'});
            if(diffSeconds<60)return relative.format(0,'second');
            if(diffMinutes<60)return relative.format(-diffMinutes,'minute');
            if(diffHours<2)return relative.format(-diffHours,'hour');
            return new Intl.DateTimeFormat(lang,{hour:'numeric',minute:'2-digit'}).format(d.toDate());
        }
        return new Intl.DateTimeFormat(lang,{...(d.year()!==now.year()?{year:'numeric'}:{}),month:'short',day:'numeric'}).format(d.toDate());
    } else {

        if (isToday) {
            if (diffSeconds < 60) return `几秒前`;
            if (diffMinutes < 60) return `${diffMinutes}分钟前`;
            if (diffHours >= 1 && diffHours < 2) return '1小时前';
            return d.format('HH:mm');
        }
        else if (now.subtract(1, 'day').isSame(d, 'day')) {
            return `昨天 ${d.format('HH:mm')}`;
        }
        else if (now.subtract(2, 'day').isSame(d, 'day')) {
            return `前天 ${d.format('HH:mm')}`;
        }
        return d.year() === now.year()
            ? d.format('M月D日')
            : d.format('YYYY/M/D');

    }

}

export function updateNow(date) {
    if (isToday) {
        if (diffSeconds < 60) return `Just now`;
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 2) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return d.format('hh:mm A');
    }
}

export function formatDetailDate(time) {
    const d = dayjs.utc(time).tz(timeZone);
    const now = dayjs();

    const isSameYear = now.year() === d.year();

    if (settingStore.lang && settingStore.lang !== 'zh') {
        return new Intl.DateTimeFormat(settingStore.lang,{...(isSameYear?{}:{year:'numeric'}),weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d.toDate());
    } else {
        return d.locale('zh-cn').format('YYYY年M月D日 ddd HH:mm');
    }
}

export function tzDayjs(time) {
    return dayjs.utc(time).tz(timeZone)
}

export function toUtc(time) {
    return dayjs(time).utc()
}

export function setExtend(lang) {
    dayjs.locale(lang)
}
