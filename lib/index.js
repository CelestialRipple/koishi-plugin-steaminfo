"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");
exports.name = 'steaminfo';
exports.Config = koishi_1.Schema.object({
    Cookie: koishi_1.Schema.string().role('secret').required().description('可选，获取Steam国区商店售价需要国区账号的Cookie（默认美元）,请浏览器访问Steam使用F12获取Cookie填入。格式示例：browserid=xxxx; timezoneOffset=28800,0; _ga=xxxx; steamLoginSecure=xxxx; sessionid=xxxx; _gid=xxxx'),
    Only_games: koishi_1.Schema.boolean().description('是否只需要检索游戏本体，如果需要限定检索范围，请将这个选项勾上并填写steam_key').default(false),
    steam_key: koishi_1.Schema.string().role('secret').required().description('限定搜索范围时，需要填写此选项，请前往以下链接申请https://steamcommunity.com/dev/registerkey'),
    last_appid: koishi_1.Schema.string().role('secret').required().description('初始检索的appid。限定搜索范围时单次查找游戏上限为50000，此项留空时将按时间升序检索游戏，因此最新的作品可能在50000之外，建议将此项填写为900000'),
    translate: koishi_1.Schema.boolean().description('是否启用自动翻译，请提前安装translator插件。').default(false),
    bing: koishi_1.Schema.boolean().description('是否启用bing翻译，如果勾选次项需要填写bing翻译的API（请勿与自动翻译同时开启）').default(false),
    bing_secret:koishi_1.Schema.string().role('secret').required().description('bing翻译的api secret，请访问https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation申请'),
    bing_region:koishi_1.Schema.string().required().description('bing翻译的api所在地区，例：southeastasia'),
});
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

      

function apply(ctx, config) {
     ctx
    .command("查询 <text:text>", "检索游戏名称")
    .action(async ({ session }, text) => {
     let translated = false;
      // 判断输入中是否包含中文
   if (config.translate) {
       
      if (text.match(/[\u4e00-\u9fa5]+/g)) {
        try {
          // 将中文翻译成英文
          text = (await ctx.translator.translate({ input: text, target: 'en' })).toLocaleLowerCase();
          translated = true;
        } catch (err) {
          console.warn(err);
        }
      }
   }else{
          if (text.match(/[\u4e00-\u9fa5]+/g) && !config.bing) {
              return `检测到输入包含中文，并且未启用自动翻译，检索失败！`
          }
      }
      
      
      
    
      if (config.bing) {
        if (text.match(/[\u4e00-\u9fa5]+/g)) {
          try {
            // 将中文翻译成英文
            let key = config.bing_secret;
            let region = config.bing_region;
            let endpoint = "https://api.cognitive.microsofttranslator.com";
            const response = await axios({
              baseURL: endpoint,
              url: '/translate',
              method: 'post',
              headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-type': 'application/json',
                'Ocp-Apim-Subscription-Region': region,
                'X-ClientTraceId': uuidv4().toString()
              },
              params: {
                'api-version': '3.0',
                'from': 'zh-CN',
                'to': 'en'
              },
              data: [{
                'text': text
              }],
              responseType: 'json'
            });
            text = response.data[0].translations[0].text;
            translated = true;
          } catch (err) {
            console.warn(err);
          }
        }
      } else if (text.match(/[\u4e00-\u9fa5]+/g) && !config.translate) {
        return `检测到输入包含中文，并且未启用翻译，检索失败！`;
      }
      let steam_key = config.steam_key;
      let last_appid = config.last_appid
     let response;
     let appList;
if (config.Only_games) {
  response = await axios.get(`https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${steam_key}&max_results=50000&last_appid=${last_appid}`);
} else {
  response = await axios.get('http://api.steampowered.com/ISteamApps/GetAppList/v0001');
}
      if (response.status === 200) {
           if (config.Only_games) {
    appList = response.data.response.apps;
  } else {
    appList = response.data.applist.apps.app;
  }
        const matchingApps = appList.filter((app) => app.name.match(new RegExp(`\\b(${text.split(' ').join('.*')})\\b`, 'i')))
        if (matchingApps.length > 50) {
            const newMatchingApps = matchingApps.splice(0, 30);
return `\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n检索到的游戏过多，已为你返回前30个相关性最强的结果。\n${newMatchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“id ${matchingApps[0].appid}”`;
        } else if (matchingApps.length === 1) {
const appid = matchingApps[0].appid;
return session.execute(`id ${appid}`);
} 
        
        else if (matchingApps.length > 0) {
         return `为实现最佳查询效果，请使用英文输入。\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n查询到 ${matchingApps.length} 个游戏：\n${matchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“id ${matchingApps[0].appid}”`;

        } else {
          return `为实现最佳查询效果，请使用英文输入。\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n未查询到匹配的游戏`;

        }
      } else {
        return `请求失败：${response.statusText}`;
      }
    });
    ctx
    .command("id <appid>", "检索appid")
    .alias('id：', 'ID' , 'appid')
  .action(async ({ session }, appid) => {
    const link = `http://store.steampowered.com/api/appdetails/?appids=${appid}`;
    const response = await axios.get(link, {
   headers: {
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie' : config.Cookie
  },
});
   if (response.status === 200) {
  if (response.data[appid] && response.data[appid].data) {
    const data = response.data[appid].data;
    const values = [];
    
    if (data.name) {
      values.push(`名称：${data.name}`);
    }

 if (data.type) {
      values.push(`类型：${data.type}`);
    }
    if (data.short_description) {
      values.push(`简介：${data.short_description}`);
    }
    if (data.genres) {
  const genreDescriptions = data.genres.map(genre => genre.description).join(', ');
  values.push(`类型：${genreDescriptions}`);
}


   if (data.supported_languages) {
  values.push(`语言：${data.supported_languages.replace(/<br\/?>/g, '。注：')}`);
}

    if (data.platforms && data.platforms.mac) {
      values.push(`Mac支持：${data.platforms.mac}`);
    }

    if (data.price_overview) {
      values.push(`当前售价：${data.price_overview.final_formatted}`);
    }
    
    if (data.metacritic) {
      values.push(`MC均分：${data.metacritic.score}分`);
    }
    if (data.release_date) {
      values.push(`发售日期：${data.release_date.date}`);
    }
    if (response.status === 200) {
      values.push(`官方链接：https://store.steampowered.com/app/${appid}`);
    }

    let imageData = null;
    let image1 = null;
    let image2 = null;

    if (data.header_image) {
      imageData = await ctx.http.get(data.header_image, { responseType: 'arraybuffer' });
    }

    if (data.screenshots && data.screenshots.length >= 1 && data.screenshots[0].path_full) {
      image1 = await ctx.http.get(data.screenshots[0].path_full, { responseType: 'arraybuffer' });
}

if (data.screenshots && data.screenshots.length >= 2 && data.screenshots[1].path_full) {
image2 = await ctx.http.get(data.screenshots[1].path_full, { responseType: 'arraybuffer' });
}

// 将图片数据拼接在返回的字符串中

let result = values.join('\n');

if (imageData) {
  result += koishi_1.segment.image(imageData);
}

if (image1) {
  result += koishi_1.segment.image(image1);
}

if (image2) {
  result += koishi_1.segment.image(image2);
}

return result;
    
  } else {
    return 'appid不存在或该游戏锁区，请检查您配置的Cookie是否有权限访问该游戏。';
  }
    } else {
      return `请求失败：${response.statusText}`;
    }
  });

 
}

exports.apply = apply;