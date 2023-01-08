"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");
exports.name = 'steaminfo';
exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
    Cookie: koishi_1.Schema.string().role('secret').description('可选，获取Steam国区商店售价需要国区账号的Cookie（默认美元）,请浏览器无痕模式访问Steam使用F12获取Cookie填入。已知BUG：当容器重启时会出现浏览缓存，如果发现查询信息为英文，请手动清空ck后重新查询，此后再次填入ck进行刷新。格式示例：browserid=xxxx; timezoneOffset=28800,0; _ga=xxxx; steamLoginSecure=xxxx; sessionid=xxxx; _gid=xxxx'),
    translate: koishi_1.Schema.boolean().description('是否启用自动翻译，请提前安装translator插件。').default(false),
    keywords: koishi_1.Schema.array(String).description('添加需要的过滤关键词，例如：soundtrack'),
    Chinese_support: koishi_1.Schema.boolean().description('中文检索，强烈推荐(请勿与翻译功能同时开启！）注：此项需要安装cheerio库解析HTML，可以使用“npm install cheerio”').default(false),
  }).description('基础设置'),
  koishi_1.Schema.object({
    Only_games: koishi_1.Schema.boolean().description('是否只需要检索游戏本体（数量限制，不推荐），如果需要限定检索范围，请将这个选项勾上并填写steam_key').default(false),
    steam_key: koishi_1.Schema.string().role('secret').description('单独检索游戏本体时，需要填写此选项，请前往以下链接申请https://steamcommunity.com/dev/registerkey'),
last_appid: koishi_1.Schema.string().description('初始检索的appid。单独检索游戏本体时单次查找游戏上限为50000，此项留空时将按时间升序检索游戏。'),
  }).description('限定搜索范围'),
  koishi_1.Schema.object({
 bing: koishi_1.Schema.boolean().description('是否启用bing翻译，如果勾选次项需要填写bing翻译的API（请勿与自动翻译、中文检索同时开启）').default(false),
    bing_secret:koishi_1.Schema.string().role('secret').description('bing翻译的api secret，请访问https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation申请'),
    bing_region:koishi_1.Schema.string().description('bing翻译的api所在地区，例：southeastasia'),
  }).description('bing翻译'),
  koishi_1.Schema.object({
 type: koishi_1.Schema.boolean().description('显示类型').default(true),
 short_description: koishi_1.Schema.boolean().description('显示短介绍').default(true),
  detailed_description: koishi_1.Schema.boolean().description('显示详细介绍').default(false),
 genres: koishi_1.Schema.boolean().description('显示游戏分类').default(true),
 supported_languages: koishi_1.Schema.boolean().description('显示支持的语言').default(true),
 platforms: koishi_1.Schema.boolean().description('显示MAC支持').default(true),
initial_formatted: koishi_1.Schema.boolean().description('显示游戏原价').default(true),
 
 final_formatted: koishi_1.Schema.boolean().description('显示当前售价（折后价）').default(true),
 metacritic: koishi_1.Schema.boolean().description('显示MC均分').default(true),
 pc_requirements: koishi_1.Schema.boolean().description('显示推荐配置').default(false),
 release_date: koishi_1.Schema.boolean().description('显示发售日期').default(true),
 categories: koishi_1.Schema.boolean().description('显示游戏标签').default(true),
 achievements: koishi_1.Schema.boolean().description('显示成就总数').default(true),
  }).description('自定义查询信息'),
])
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');



function extractGameNames(html) {
  const $ = cheerio.load(html);

  const gameNames = [];
  $('.game').each((i, element) => {
    const $element = $(element);
    const gameName = $element.find('h2 a').text();
    gameNames.push(gameName);
  });

  return gameNames[0];
}

function extractEnglishGameNames(html) {
const $ = cheerio.load(html);

const gameNames = [];
$('.game').each((i, element) => {
const $element = $(element);
const gameName = $element.find('.old_name').text();
gameNames.push(gameName);
});
return gameNames[0];
}


      

function apply(ctx, config) {
     ctx
    .command("查询 <text:text>", "检索游戏名称")
    .action(async ({ session }, text) => {
     let translated = false;
     let vgtime = false;
      // 判断输入中是否包含中文
      if (config.Chinese_support) {
       
      if (text.match(/[\u4e00-\u9fa5]+/g)) {
        try {
         const url = `https://www.vgtime.com/search/game.jhtml?keyword=${text}&type=game&page=1&pageSize=12&domName=search_game_list`;
        const response = await axios.get(url);
        const html = response.data;

        // 调用提取游戏名称的函数
        const gameNames = extractGameNames(html);
        const EnglishGameNames = extractEnglishGameNames(html);
        if (EnglishGameNames.length === 0 || /[^\x00-\xff]/.test(EnglishGameNames)) {
    return 'Sorry, 此游戏不存在英文名称，无法检索！您可以尝试直接查询英文名称。';
  }
        text = EnglishGameNames
        vgtime = true
        } catch (err) {
          console.warn(err);
        }
      }
   }else{
          if (text.match(/[\u4e00-\u9fa5]+/g) && !config.bing && !config.Chinese_support) {
              return `检测到输入包含中文，并且未启用自动翻译或中文匹配，检索失败！您可以尝试直接查询英文名称。`
          }
      }
      //自动翻译
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
          if (text.match(/[\u4e00-\u9fa5]+/g) && !config.bing && !config.Chinese_support) {
              return `检测到输入包含中文，并且未启用自动翻译或中文匹配，检索失败！`
          }
      }
      
      //bing翻译
      
    
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
      } else if (text.match(/[\u4e00-\u9fa5]+/g) && !config.translate && !config.Chinese_support) {
        return `检测到输入包含中文，并且未启用翻译或中文匹配，检索失败！`;
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
        let matchingApps = appList.filter((app) => app.name.match(new RegExp(`\\b(${text.split(' ').join('.*')})\\b`, 'i')));
if (config.keywords.length > 0) {
  // 过滤掉与关键词匹配的游戏信息
  const filteredApps = matchingApps.filter(app => !config.keywords.some(keyword => new RegExp(`\\b(${keyword.split(' ').join('.*')}).*\\b`, 'i').test(app.name)));
  matchingApps = filteredApps;
}
 const url = `https://www.vgtime.com/search/game.jhtml?keyword=${text}&type=game&page=1&pageSize=12&domName=search_game_list`;
        const responses = await axios.get(url);
        const html = responses.data;

        // 调用提取游戏名称的函数
        const gameNames = extractGameNames(html);
        
        if (matchingApps.length > 50) {
            
  const newMatchingApps = matchingApps.splice(0, 30);
  session.send(`\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n${vgtime ? '猜你想搜：' + gameNames : ''}\n检索到的游戏过多，已为你返回前30个相关性最强的结果。\n${newMatchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“${matchingApps[0].appid}”`);
  session.prompt((session) => {
    const appid = session.content.match(/\d+/);
if (appid) {
  return session.execute(`id ${appid[0]}`);
} else {
  return session.send("请输入正确的appid");
}
  });
} else if (matchingApps.length === 1) {
  const appid = matchingApps[0].appid;
  session.send(`${vgtime ? '猜你想搜：' + gameNames : ''}\n`);
  session.execute(`id ${appid}`);
} else if (matchingApps.length > 0) {
  session.send(`为实现最佳查询效果，请使用英文输入。\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n${vgtime ? '猜你想搜：' + gameNames : ''}\n查询到 ${matchingApps.length} 个游戏：\n${matchingApps.map((app) => `游戏名称：${app.name}，appid：${app.appid}`).join('\n')}\n请输入你想要查询游戏的appid，例：“${matchingApps[0].appid}”`);
  session.prompt((session) => {
    const appid = session.content.match(/\d+/);
if (appid) {
  return session.execute(`id ${appid[0]}`);
} else {
  return session.send("请输入正确的appid");
}

});
} else {
session.send(`为实现最佳查询效果，请使用英文输入。\n${translated ? '检测到您输入的名称中包含中文，已自动翻译成英文：' + text : ''}\n${vgtime ? '猜你想搜：' + gameNames : ''}\n未查询到匹配的游戏`);
}
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

 if (data.type && config.type) {
      values.push(`类型：${data.type}`);
    }
    if (data.short_description && config.short_description) {
      values.push(`简介：${data.short_description}`);
    }
    if (data.detailed_description && config.detailed_description) {
      values.push(`详细介绍：${data.detailed_description.replace(/<br\/?>/g, '\n')}\n\n`);
    }
    if (data.genres && config.genres) {
  const genreDescriptions = data.genres.map(genre => genre.description).join(', ');
  values.push(`分类：${genreDescriptions}`);
}

if (data.categories && config.categories ) {
  const categoriesDescriptions = data.categories.map(genre => genre.description).join(', ');
  values.push(`标签：${categoriesDescriptions}`);
}

   if (data.supported_languages && config.supported_languages) {
  values.push(`语言：${data.supported_languages.replace(/<br\/?>/g, '。注：')}`);
}

    if (data.platforms && data.platforms.mac && config.platforms) {
      values.push(`Mac支持：${data.platforms.mac}`);
    }
if (data.pc_requirements.recommended && config.pc_requirements) {
      values.push(`PC配置：${data.pc_requirements.recommended.replace(/<br\/?>/g, ',')}\n\n`);
    }
    
if (data.price_overview.initial_formatted && config.initial_formatted) {
      values.push(`原始售价：${data.price_overview.initial_formatted}`);
    }
    
    if (data.price_overview && config.final_formatted) {
      values.push(`\n当前售价：${data.price_overview.final_formatted}`);
    }
    
    if (data.metacritic && config.metacritic) {
      values.push(`MC均分：${data.metacritic.score}分`);
    }
    if (data.achievements  && config.achievements) {
      values.push(`成就总数：${data.achievements.total}个`);
    }
    if (data.release_date && config.release_date) {
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
