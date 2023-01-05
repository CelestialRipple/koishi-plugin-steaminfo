"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");
exports.name = 'steaminfo';
exports.Config = koishi_1.Schema.object({
    Cookie: koishi_1.Schema.string().role('secret').required().description('获取Steam国区商店售价需要国区账号的Cookie,请浏览器访问Steam使用F12获取Cookie填入'),
});
const axios = require('axios');

function apply(ctx, config) {
  ctx
    .command("查询 <text...>", "检索游戏名称")
    .action(async ({ session }, text) => {
      const response = await axios.get('http://api.steampowered.com/ISteamApps/GetAppList/v0001');
      if (response.status === 200) {
        const appList = response.data.applist.apps.app;
        const matchingApps = appList.filter((app) => app.name.match(new RegExp(`\\b(${text.split(' ').join('.*')})\\b`, 'i')))
        if (matchingApps.length > 50) {
            const newMatchingApps = matchingApps.splice(0, 30);
          return `检索到的游戏过多，已为你返回前30个相关性最强的结果。\n${newMatchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“id ${matchingApps[0].appid}”`;
        } else if (matchingApps.length > 0) {
          return `为实现最佳查询效果，请使用英文输入。\n查询到 ${matchingApps.length} 个游戏：\n${matchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“id ${matchingApps[0].appid}”`;
        } else {
          return '为实现最佳查询效果，请使用英文输入。\n未查询到匹配的游戏';
        }
      } else {
        return `请求失败：${response.statusText}`;
      }
    });
    ctx
  .command("id <appid>", "检索appid")
  .action(async ({ session }, appid) => {
    const link = `http://store.steampowered.com/api/appdetails/?appids=${appid}`;
    const response = await axios.get(link, {
   headers: {
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie' : config.Cookie
  },
});
    if (response.status === 200) {
      const data = response.data[appid].data;
      const imageData = await ctx.http.get(data.header_image, { responseType: 'arraybuffer' });
      const image1 = await ctx.http.get(data.screenshots[0].path_full, { responseType: 'arraybuffer' });
      const image2 = await ctx.http.get(data.screenshots[1].path_full, { responseType: 'arraybuffer' });
      return `游戏名称：${data.name}\n游戏简介：${data.short_description}\n支持语言：${data.supported_languages.replace(/<br\/>/g, '\n').replace(/^<br>/, '')}\nMac支持：${data.platforms.mac}\n原价：${data.price_overview.initial_formatted}\n折后价：${data.price_overview.final_formatted}\n发售日期：${data.release_date.date}${koishi_1.segment.image(imageData)}${koishi_1.segment.image(image1)}${koishi_1.segment.image(image2)}`;
    } else {
      return `请求失败：${response.statusText}`;
    }
  });
   ctx
  .command("appid <appid>", "检索appid")
  .action(async ({ session }, appid) => {
    const link = `http://store.steampowered.com/api/appdetails/?appids=${appid}`;
    const response = await axios.get(link, {
   headers: {
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie' : config.Cookie
  },
});
    if (response.status === 200) {
      const data = response.data[appid].data;
      const imageData = await ctx.http.get(data.header_image, { responseType: 'arraybuffer' });
      const image1 = await ctx.http.get(data.screenshots[0].path_full, { responseType: 'arraybuffer' });
      const image2 = await ctx.http.get(data.screenshots[1].path_full, { responseType: 'arraybuffer' });
      return `游戏名称：${data.name}\n游戏简介：${data.short_description}\n支持语言：${data.supported_languages.replace(/<br\/>/g, '\n').replace(/^<br>/, '')}\nMac支持：${data.platforms.mac}\n原价：${data.price_overview.initial_formatted}\n折后价：${data.price_overview.final_formatted}\n发售日期：${data.release_date.date}${koishi_1.segment.image(imageData)}${koishi_1.segment.image(image1)}${koishi_1.segment.image(image2)}`;
    } else {
      return `请求失败：${response.statusText}`;
    }
  });
  

 
}

exports.apply = apply;