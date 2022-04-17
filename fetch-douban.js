/**
 * QuickAdd Macro: Fetching Douban book/movie/music info into Obsidian
 * QuickAdd 宏：获取豆瓣读书、电影、音乐等信息至Obsidian
 * 
 * 其中：
 * 实现思路及部分代码来自：https://github.com/LumosLovegood/myScripts/tree/main/DoubanAllInOne
 * 豆瓣解密代码来自：https://github.com/SergioJune/Spider-Crack-JS
 * 
 * 感谢以上作者
 * 
 * @author Lucas Wang
 */

const BOOK_CHOICE_CONFIG = 'Book Template Choice';
const MOVIE_CHOICE_CONFIG = 'Movie Template Choice';
const MUSIC_CHOICE_CONFIG = 'Music Template Choice';

// 搜索分类
const CATEGORIES = [
    {
        id: 0,
        text: '综合',
        searchPre: 'https://www.douban.com/search/?q=',
        searchTitle: '豆瓣综合搜索',
        searchHint: '搜索书籍、电影、音乐',
    },
    {
        id: 10,
        text: '书籍',
        linkPre: 'https://book.douban.com/subject/',
        searchPre: 'https://search.douban.com/book/subject_search?search_text=',
        searchTitle: '豆瓣读书搜索',
        searchHint: '搜索书名、作者、ISBN',
        keyword: 'book',
        choiceConfig: BOOK_CHOICE_CONFIG,
        needGuillemet: true,
    },
    {
        id: 11,
        text: '作者',
        linkPre: 'https://book.douban.com/author/',
        searchPre: '',
        searchTitle: '',
        searchHint: '',
        keyword: '',
        choiceConfig: '',
        needGuillemet: false,
    },
    {
        id: 20,
        text: '影视',
        linkPre: 'https://movie.douban.com/subject/',
        searchPre: 'https://search.douban.com/movie/subject_search?search_text=',
        searchTitle: '豆瓣电影搜索',
        searchHint: '搜索电影、电视剧、综艺、影人',
        keyword: 'movie',
        choiceConfig: MOVIE_CHOICE_CONFIG,
        needGuillemet: true,
    },
    {
        id: 21,
        text: '影星',
        linkPre: 'https://movie.douban.com/celebrity/',
        searchPre: '',
        searchTitle: '',
        searchHint: '',
        keyword: '',
        choiceConfig: '',
        needGuillemet: false,
    },
    {
        id: 30,
        text: '音乐',
        linkPre: 'https://music.douban.com/subject/',
        searchPre: 'https://search.douban.com/music/subject_search?search_text=',
        searchTitle: '豆瓣音乐搜索',
        searchHint: '搜索唱片名、表演者、条码、ISRC',
        keyword: 'music',
        choiceConfig: MUSIC_CHOICE_CONFIG,
        needGuillemet: true,
    },
    {
        id: 31,
        text: '音乐人',
        linkPre: 'https://music.douban.com/musican/',
        searchPre: '',
        searchTitle: '',
        searchHint: '',
        keyword: '',
        choiceConfig: '',
        needGuillemet: false,
    },
    {
        id: 99,
        text: '链接',
        searchPre: '',
        searchTitle: '豆瓣链接导入',
        searchHint: '输入书籍、电影、音乐的豆瓣链接',
    },
];

// 空字段的替代文本
const EMPTY_TEXT = '--';

const HEADERS = {
    "Content-Type": "text/html; charset=utf-8",
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Referer': 'https://m.douban.com/',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
}

module.exports = {
    entry: start,
    settings: {
        name: "Fetch Douban",
        author: "Lucas Wang",
        options: {
            [BOOK_CHOICE_CONFIG]: {
                type: "text",
                defaultValue: "CreateBookNote",
                placeholder: "读书笔记模版命令",
            },
            [MOVIE_CHOICE_CONFIG]: {
                type: "text",
                defaultValue: "CreateMovieNote",
                placeholder: "电影笔记模版命令",
            },
            [MUSIC_CHOICE_CONFIG]: {
                type: "text",
                defaultValue: "CreateMusicNote",
                placeholder: "音乐笔记模版命令",
            },
        },
    },
}

let QuickAdd;
let Settings;

/**
 * 主函数
 * 
 * @param {object} params
 * @param {object} settings
 * @returns 
 */
async function start(params, settings) {
    QuickAdd = params;
    Settings = settings;

    // 选择搜索类型
    const category = await QuickAdd.quickAddApi.suggester(
        (obj) => (obj.searchTitle),
        CATEGORIES.filter(obj => obj.searchTitle != '')
    );
    if (!category) {
        return;
    }

    // 输入搜索内容
    const content = await QuickAdd.quickAddApi.inputPrompt(
        category.searchTitle,
        category.searchHint
    );
    if (!content) {
        new Notice("❕没有输入任何内容");
        return;
    }

    let resultCat = {};
    let resultLink = '';
    if (category.id === 99) {
        // 检视输入的豆瓣链接
        const cats = CATEGORIES.filter(c => c.linkPre && content.includes(c.linkPre));
        if (cats.length === 0) {
            new Notice("❗输入的豆瓣链接有误");
            return;
        }
        resultCat = cats[0];
        resultLink = content;

    } else {
        // 搜索豆瓣
        let selectedItem = await searchDouban(content, category);
        if (!selectedItem) {
            new Notice("❕没有选择任何内容");
            return;
        }
        resultCat = selectedItem.category;
        resultLink = selectedItem.link;
    }

    // 校验并获取模版命令
    if (!resultCat.choiceConfig) {
        throwNotImplementedError(resultCat);
    }
    let choice = Settings[resultCat.choiceConfig];
    if (!choice) {
        let noConfig = '脚本配置' + resultCat.choiceConfig + '为空';
        new Notice('❗' + noConfig);
        throw new Error(noConfig);
    }

    // 查询豆瓣信息并生成笔记
    new Notice("⏳正在生成笔记");
    let info = await getDoubanInfo(resultCat, resultLink);
    await QuickAdd.quickAddApi.executeChoice(choice, info);
}

/**
 * 请求豆瓣（GET请求）
 * 
 * @param {string} url 请求地址
 * @returns 
 */
async function apiGet(url) {
    let requestUrl = new URL(url);
    let response = await request({
        url: requestUrl.href,
        method: "GET",
        cache: "no-cache",
        headers: HEADERS
    });

    if (!response) {
        new Notice("❗访问豆瓣异常，请重新再试");
        throw new Error("访问豆瓣异常，请重新再试");
    }

    let p = new DOMParser();
    let document = p.parseFromString(response, "text/html");
    let title = document.querySelector('title')?.textContent;
    if (title === "页面不存在") {
        new Notice("❗豆瓣页面不存在");
        throw new Error("豆瓣页面不存在");
    }

    return document;
}

/**
 * 搜索豆瓣
 * 
 * @param {string} content 输入内容
 * @param {object} category 搜索类型
 * @returns 
 */
async function searchDouban(content, category) {
    url = category.searchPre + content;
    const document = await apiGet(url);

    // 根据搜索类型解析豆瓣返回报文
    let searchResult = {};
    if (category.id === 0) {
        searchResult = parseCommonSearch(document);
    } else {
        searchResult = parseSubjectSearch(document);
    }

    if (!searchResult) {
        new Notice("❗找不到您搜索的内容");
        throw new Error("找不到您搜索的内容");
    }

    // 选择搜索结果
    return await QuickAdd.quickAddApi.suggester(
        (obj) => obj.text,
        searchResult
    );
}

/**
 * 解析豆瓣通用搜索报文
 * 
 * @param {document} document 
 * @returns 
 */
function parseCommonSearch(document) {
    let $ = s => document.querySelector(s);

    if (!$(".result-list")) {
        return null;
    }

    let results = $(".result-list").querySelectorAll(".result");
    let itemList = [];
    for (var i = 0; i < results.length; i++) {
        let $r = s => results[i].querySelector(s);
        let onclickValue = $r("h3 a").attributes.onclick.value;

        const cats = CATEGORIES.filter(c => c.keyword && onclickValue.includes(c.keyword));
        if (cats.length === 0) {
            continue;
        }
        const cat = cats[0];

        // 拼接展示文本（类型 + 名称 + 评分 + 说明）
        let textList = [];
        textList.push($r("h3 span").textContent);
        let title = $r("h3 a").textContent.trim();
        if (cat.needGuillemet) {
            title = '《' + title + '》';
        }
        textList.push(title);
        if ($r(".rating_nums")) {
            let rating = $r(".rating_nums").textContent + '分';
            textList.push(rating);
        }
        if ($r(".subject-cast")) {
            textList.push($r(".subject-cast").textContent.trim());
        }

        itemList.push({
            text: textList.join(' '),
            link: cat.linkPre + onclickValue.match(/\d+(?=,)/g),
            category: cat
        });
    }

    return itemList;
}

/**
 * 解析豆瓣主题搜索报文（需要解密）
 * 
 * @param {document} document 
 * @returns 
 */
function parseSubjectSearch(document) {
    // 获取加密结果并解密
    var scripts = document.querySelectorAll("script[type='text/javascript']");
    var text = '';
    for (var i = 0; i < scripts.length; i++) {
        let currentText = scripts[i].textContent;
        if (currentText && currentText.trim().startsWith('window.__DATA__')) {
            text = currentText;
            break;
        }
    }
    if (!text) {
        new Notice("❗检视加密报文出错");
        throw new Error("检视加密报文出错");
    }
    var cipher = text.substring(text.indexOf('"') + 1, text.lastIndexOf('"'));
    var data = decrypt(cipher);

    // 组装搜索结果
    var itemList = [];
    for (let result of data['payload']['items']) {
        if (!result.url) {
            continue;
        }
        const cats = CATEGORIES.filter(c => c.linkPre && result.url.includes(c.linkPre));
        if (cats.length === 0) {
            continue;
        }
        const cat = cats[0];

        // 拼接展示文本（类型 + 名称 + 评分 + 说明）
        let textList = [];
        textList.push('[' + cat.text + ']');
        let title = result.title;
        if (cat.needGuillemet) {
            title = '《' + result.title + '》';
        }
        textList.push(title);
        if (result.rating) {
            textList.push(result.rating.value + '分');
        }
        textList.push(result.abstract);

        itemList.push({
            text: textList.join(' '),
            link: result.url,
            category: cat
        });
    }

    return itemList;
}

/**
 * 获取豆瓣信息
 * 
 * @param {object} category 类型
 * @param {string} link 豆瓣链接
 * @returns 
 */
async function getDoubanInfo(category, link) {
    // 根据类型获取豆瓣信息
    let info = {};
    switch (category.choiceConfig) {
        case BOOK_CHOICE_CONFIG:
            info = await getBookInfo(link);
            break;
        case MOVIE_CHOICE_CONFIG:
            info = await getMovieInfo(link);
            break;
        case MUSIC_CHOICE_CONFIG:
            info = await getMusicInfo(link);
            break;
        default:
            throwNotImplementedError(category);
    }

    // 替换标题中的敏感字符（Obsidian文件名中不能含有:\/）
    if (info['title']) {
        info['title'] = info['title'].replaceAll(/[\:\\\/]/g, " ");
    }

    // 替换查询为空的文本（QuickAdd插件针对空文本会弹框提示手输）
    for (var i in info) {
        if (!info[i]) {
            info[i] = EMPTY_TEXT;
        }
    }

    return info;
}

/**
 * 抛出异常：暂未实现获取方法
 * 
 * @param {object} category 
 */
function throwNotImplementedError(category) {
    let notImplemented = '暂不支持获取豆瓣' + category.text + '信息';
    new Notice('❗' + notImplemented);
    throw new Error(notImplemented);
}

/**
 * 获取豆瓣读书信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getBookInfo(url) {
    const document = await apiGet(url);
    let $ = s => document.querySelector(s);
    let $2 = z => document.querySelectorAll(z);

    // 书名、作者、ISBN、封面
    let title = $("meta[property='og:title']")?.content;
    let author = $("meta[property='book:author']")?.content;
    let isbn = $("meta[property='book:isbn']")?.content;
    let coverUrl = $("meta[property='og:image']")?.content;

    // 其他信息(译者、原作名、页数)
    let text = $("#info")?.textContent;
    let translator = matchFirst(text, /(?<=译者:\s*)\S+\s?\S+/g);
    let originalTitle = matchFirst(text, /(?<=原作名:\s*)[\S ]+/g);
    let subtitle = matchFirst(text, /(?<=副标题:\s*)[\S ]+/g);
    let pageNum = matchFirst(text, /(?<=页数:\s*)[\S ]+/g);
    let publisher = matchFirst(text, /(?<=出版社:\s*)[\S ]+/g);
    let publishDate = matchFirst(text, /(?<=出版年:\s*)[\S ]+/g);
    let series = matchFirst(text, /(?<=丛书:\s*)[\S ]+/g);
    let price = matchFirst(text, /(?<=定价:\s*)[\S ]+/g);
    let binding = matchFirst(text, /(?<=装帧:\s*)[\S ]+/g);

    // 书籍和作者简介
    let intro = "";
    let authorIntro = "";
    var temp1 = $("h2");
    if (temp1.innerText.includes("内容简介")) {
        var temp2 = temp1.nextElementSibling.querySelectorAll("div.intro")
        var temp3 = temp2[temp2.length - 1].querySelectorAll("p");
        for (var i = 0; i < temp3.length; i++) {
            intro = intro + temp3[i].textContent + "\n";
        }
        try {
            temp2 = $2("h2")[1].nextElementSibling.querySelectorAll("div.intro");
            temp3 = temp2[temp2.length - 1].querySelectorAll("p");
            for (var i = 0; i < temp3.length; i++) {
                authorIntro = authorIntro + temp3[i].textContent + "\n";
            }
        } catch (e) {
            new Notice("没有作者简介");
        }
    } else if (temp1.innerText.includes("作者简介")) {
        var temp2 = temp1.nextElementSibling.querySelectorAll("div.intro")
        var temp3 = temp2[temp2.length - 1].querySelectorAll("p");
        for (var i = 0; i < temp3.length; i++) {
            authorIntro = authorIntro + temp3[i].textContent + "\n";
        }
    }

    // 目录信息
    let doubanID = url.match(/\d+/g)[0];
    let catalog = $(`#dir_${doubanID}_full`)?.innerText?.replace(/^\s+|· *|\(收起\)$/gm, "");

    // 原文摘录
    let quote1 = "";
    let quote2 = "";
    let quoteList = $2("figure");
    let sourceList = $2("figcaption");
    if (quoteList.length != 0) {
        quote1 = quoteList[0]?.childNodes[0].textContent.replace(/\(/g, "").trim() + "\n"
            + sourceList[0].textContent.replace(/\s/g, "");
        quote2 = quoteList[1]?.childNodes[0].textContent.replace(/\(/g, "").trim() + "\n"
            + sourceList[1].textContent.replace(/\s/g, "");
    }

    // 豆瓣常用标签
    var temp = $2("script");
    let tags = temp[temp.length - 3].textContent.match(/(?<=:)[\u4e00-\u9fa5·]+/g);
    tags.push("book");

    // 相关书籍
    let relatedBooks = [];
    temp = $2("div#db-rec-section div dl dd");
    if (temp) {
        for (var i = 0; i < temp.length; i++) {
            relatedBooks.push(temp[i].textContent.replace(/\s/g, ""));
        }
    }

    let rank = $(".rank-label-link")?.textContent?.trim();
    if (rank) {
        rank += ' (' + $(".rank-label-no")?.textContent?.trim() + ')';
    }
    let ratingInfo = parseRatingInfo($);

    let bookInfo = {
        title,
        author,
        translator,
        coverUrl,
        originalTitle,
        subtitle,
        pageNum,
        publisher,
        intro,
        isbn,
        authorIntro,
        quote1,
        quote2,
        tags,
        relatedBooks,
        linkUrl: url,
        publishDate,
        catalog,
        rank,
        series,
        price,
        binding,
        ...ratingInfo,
    };

    return bookInfo;
}

/**
 * 获取豆瓣作者信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getAuthorInfo(url) {
    // TODO 待实现
}

/**
 * 获取豆瓣电影信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getMovieInfo(url) {
    const document = await apiGet(url);
    let $ = s => document.querySelector(s);

    let top250 = $(".top250-no")?.textContent;
    let title = $("title")?.textContent?.replace("(豆瓣)", "")?.trim();
    let fullTitle = $("meta[property='og:title']")?.content;
    let director = $("meta[property='video:director']")?.content;
    let coverUrl = $("meta[property='og:image']")?.content;

    let detail = $("#info")?.textContent;
    let editor = matchFirst(detail, /(?<=编剧:\s*)[\S ]+/g);
    let starring = matchFirst(detail, /(?<=主演:\s*)[\S ]+/g);
    let genre = matchFirst(detail, /(?<=类型:\s*)[\S ]+/g);
    let country = matchFirst(detail, /(?<=制片国家\/地区:\s*)[\S ]+/g);
    let language = matchFirst(detail, /(?<=语言:\s*)[\S ]+/g);
    let otherTitles = matchFirst(detail, /(?<=又名:\s*)[\S ]+/g);
    let runningTime = matchFirst(detail, /(?<=片长:\s*)[\S ]+/g);
    let episodeNum = matchFirst(detail, /(?<=集数:\s*)[\S ]+/g);
    let imdbId = matchFirst(detail, /(?<=IMDb:\s*)[\S ]+/g);
    let releaseDate = matchFirst(detail, /(?<=上映日期:\s*)[\S ]+/g);
    if (!releaseDate) {
        releaseDate = matchFirst(detail, /(?<=首播:\s*)[\S ]+/g);
    }

    let summary = parseSummary($);
    let ratingInfo = parseRatingInfo($);

    let awardList = [];
    let uls = document.querySelectorAll("ul.award");
    for (var i = 0; i < uls.length; i++) {
        let lis = uls[i].querySelectorAll("li");
        let award = '';
        for (var j = 0; j < lis.length; j++) {
            let seperator = '';
            if (j === 1) {
                seperator = '\n';
            } else if (j > 1) {
                seperator = ' ';
            }
            award += seperator + lis[j].textContent.trim();
        }
        awardList.push(award);
    }
    let award = awardList.join('\n\n');

    let movieInfo = {
        top250,
        title,
        fullTitle,
        director,
        editor,
        starring,
        language,
        country,
        otherTitles,
        linkUrl: url,
        coverUrl,
        genre,
        imdbId,
        runningTime,
        episodeNum,
        releaseDate,
        summary,
        award,
        ...ratingInfo,
    };

    return movieInfo;
}

/**
 * 获取豆瓣影星信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getCelebrityInfo(url) {
    // TODO 待实现
}

/**
 * 获取豆瓣音乐信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getMusicInfo(url) {
    const document = await apiGet(url);
    let $ = s => document.querySelector(s);

    let title = $("meta[property='og:title']")?.content;
    let coverUrl = $("meta[property='og:image']")?.content;
    let musican = $("meta[property='music:musician']")?.content;

    let detail = $("#info")?.textContent;
    let otherTitles = matchFirst(detail, /(?<=又名:\s*)[\S ]+/g);
    let genre = matchFirst(detail, /(?<=流派:\s*)[\S ]+/g);
    let albumType = matchFirst(detail, /(?<=专辑类型:\s*)[\S ]+/g);
    let medium = matchFirst(detail, /(?<=介质:\s*)[\S ]+/g);
    let releaseDate = matchFirst(detail, /(?<=发行时间:\s*)[\S ]+/g);
    let publisher = matchFirst(detail, /(?<=出版者:\s*)[\S ]+/g);
    let albumNum = matchFirst(detail, /(?<=唱片数:\s*)[\S ]+/g);
    let barCode = matchFirst(detail, /(?<=条形码:\s*)[\S ]+/g);
    let isrc = matchFirst(detail, /(?<=ISRC\(中国\):\s*)[\S ]+/g);

    let summary = parseSummary($);
    let ratingInfo = parseRatingInfo($);
    let trackList = $("div.track-list > div > div")?.innerHTML?.replaceAll('<br>', '\n')?.trim();
    if (trackList) {
        trackList = htmlDecode(trackList);
    }

    let musicInfo = {
        title,
        linkUrl: url,
        coverUrl,
        musican,
        otherTitles,
        genre,
        albumType,
        medium,
        releaseDate,
        publisher,
        albumNum,
        barCode,
        isrc,
        summary,
        trackList,
        ...ratingInfo,
    };

    return musicInfo;
}

/**
 * 获取豆瓣音乐人信息
 * 
 * @param {string} url 地址
 * @returns 
 */
async function getMusicanInfo(url) {
    // TODO 待实现
}

/**
 * 解析豆瓣评分信息
 * 
 * @param {function} $ 
 * @returns 
 */
function parseRatingInfo($) {
    let rating = $("div.rating_self > strong")?.textContent?.trim();
    let ratingNum = $("span[property='v:votes']")?.textContent?.trim();
    let ratingDetail = [];
    var root = $(".ratings-on-weight") ?? $("#interest_sectl");
    var items = root.querySelectorAll(".rating_per");
    for (var i = 0; i < items.length; i++) {
        ratingDetail.push(items[i].textContent);
    }
    return { rating, ratingNum, ratingDetail };
}

/**
 * 解析豆瓣简介信息
 * 
 * @param {function} $ 
 * @returns 
 */
function parseSummary($) {
    // 存在隐藏、非隐藏两种格式
    let summary = '';
    if ($("#link-report > .hidden")) {
        summary = $("#link-report > .hidden")?.innerHTML;
    } else {
        summary = $("span[property='v:summary']")?.innerHTML;
    }

    if (!summary) {
        return '';
    }

    // 转换换行符并去除段落首行缩进
    summary = summary.replaceAll('<br>', '\n').replaceAll(/(?<=\n)\s+/g, '').trim();

    return htmlDecode(summary);
}

/**
 * 找到字符串第一个正则表达式的匹配
 * 
 * @param {string} str 
 * @param {RegExp} regexp 
 * @returns 
 */
function matchFirst(str, regexp) {
    return str.match(regexp) ? str.match(regexp)[0].trim() : '';
}

/**
 * HTML解码
 * 
 * @param {string} html HTML文本
 * @returns 
 */
function htmlDecode(html) {
    var temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent;
}

// ------------------------------ 以下为豆瓣解密相关代码 ------------------------------

var r = "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";

var i = 16
var Q = 4096
var p = {
    start: 2,
    end: 7
}
var K = {}
K.read = function (t, e, r, n, o) {
    var i, a, s = 8 * o - n - 1, u = (1 << s) - 1, c = u >> 1, f = -7, l = r ? o - 1 : 0, h = r ? -1 : 1, p = t[e + l];
    for (l += h,
        i = p & (1 << -f) - 1,
        p >>= -f,
        f += s; f > 0; i = 256 * i + t[e + l],
        l += h,
        f -= 8)
        ;
    for (a = i & (1 << -f) - 1,
        i >>= -f,
        f += n; f > 0; a = 256 * a + t[e + l],
        l += h,
        f -= 8)
        ;
    if (0 === i)
        i = 1 - c;
    else {
        if (i === u)
            return a ? NaN : 1 / 0 * (p ? -1 : 1);
        a += Math.pow(2, n),
            i -= c
    }
    return (p ? -1 : 1) * a * Math.pow(2, i - n)
}

K.write = function (t, e, r, n, o, i) {
    var a, s, u, c = 8 * i - o - 1, f = (1 << c) - 1, l = f >> 1, h = 23 === o ? Math.pow(2, -24) - Math.pow(2, -77) : 0, p = n ? 0 : i - 1, d = n ? 1 : -1, m = e < 0 || 0 === e && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e),
        isNaN(e) || e === 1 / 0 ? (s = isNaN(e) ? 1 : 0,
            a = f) : (a = Math.floor(Math.log(e) / Math.LN2),
                e * (u = Math.pow(2, -a)) < 1 && (a--,
                    u *= 2),
                e += a + l >= 1 ? h / u : h * Math.pow(2, 1 - l),
                e * u >= 2 && (a++,
                    u /= 2),
                a + l >= f ? (s = 0,
                    a = f) : a + l >= 1 ? (s = (e * u - 1) * Math.pow(2, o),
                        a += l) : (s = e * Math.pow(2, l - 1) * Math.pow(2, o),
                            a = 0)); o >= 8; t[r + p] = 255 & s,
                            p += d,
                            s /= 256,
        o -= 8)
        ;
    for (a = a << o | s,
        c += o; c > 0; t[r + p] = 255 & a,
        p += d,
        a /= 256,
        c -= 8)
        ;
    t[r + p - d] |= 128 * m
}

encry2arr_from = function (t, e, r) {  // 1  39  50  66
    return from_a(null, t, e, r)
}

function hash(e) {
    return "string" == typeof e && (e = encry2arr_from(e)), to_string.call((0, o_default)(e, 41405), 16).replace(/^0+/, "")
}

function to_number() {
    return 65536 * this._a16 + this._a00
}

function to_string(t) {
    t = t || 10;
    var e = new i_i(t);
    if (!gt.call(this, e))
        return to_number.call(this).toString(t);
    for (var r = clone.call(this), n = new Array(64), o = 63; o >= 0 && (div.call(r, e),
        n[o] = to_number.call(r.remainder).toString(t), gt.call(r, e)); o--);
    return n[o - 1] = to_number.call(r).toString(t),
        n.join("")
}

gt = function (t) {
    return this._a48 > t._a48 || !(this._a48 < t._a48) && (this._a32 > t._a32 || !(this._a32 < t._a32) && (this._a16 > t._a16 || !(this._a16 < t._a16) && this._a00 > t._a00))
}

function div(t) {
    for (var e = clone.call(t), r = -1; !lt.call(this, e);)
        shiftLeft.call(e, 1, !0),
            r++;
    for (this.remainder = clone.call(this),
        this._a00 = 0,
        this._a16 = 0,
        this._a32 = 0,
        this._a48 = 0; r >= 0; r--)
        shiftRight.call(e, 1),
            lt.call(this.remainder, e) || (subtract(this.remainder, e),
                r >= 48 ? this._a48 |= 1 << r - 48 : r >= 32 ? this._a32 |= 1 << r - 32 : r >= 16 ? this._a16 |= 1 << r - 16 : this._a00 |= 1 << r);
    return this
}

function eq(t) {
    return this._a48 == t._a48 && this._a00 == t._a00 && this._a32 == t._a32 && this._a16 == t._a16
}

function lt(t) {
    return this._a48 < t._a48 || !(this._a48 > t._a48) && (this._a32 < t._a32 || !(this._a32 > t._a32) && (this._a16 < t._a16 || !(this._a16 > t._a16) && this._a00 < t._a00))
}

function shiftLeft(t, e) {
    return t %= 64,
        t >= 48 ? (this._a48 = this._a00 << t - 48,
            this._a32 = 0,
            this._a16 = 0,
            this._a00 = 0) : t >= 32 ? (t -= 32,
                this._a48 = this._a16 << t | this._a00 >> 16 - t,
                this._a32 = this._a00 << t & 65535,
                this._a16 = 0,
                this._a00 = 0) : t >= 16 ? (t -= 16,
                    this._a48 = this._a32 << t | this._a16 >> 16 - t,
                    this._a32 = 65535 & (this._a16 << t | this._a00 >> 16 - t),
                    this._a16 = this._a00 << t & 65535,
                    this._a00 = 0) : (this._a48 = this._a48 << t | this._a32 >> 16 - t,
                        this._a32 = 65535 & (this._a32 << t | this._a16 >> 16 - t),
                        this._a16 = 65535 & (this._a16 << t | this._a00 >> 16 - t),
                        this._a00 = this._a00 << t & 65535),
        e || (this._a48 &= 65535),
        this
}

var t = {
    'getState': function (e) {
        return a(e)
    },
    'dispatch': function o() {
        return p
    }
}
var Ut = {
    "$UID": "j",
    "$defaultRootUID": 4,
    "$keys": "z",
    "$vals": "k",
    "crypto": {
        "decrypt": function n(t, e) {
            return r_decrypt(t, e)
        },
        "encrypt": function r(e) {
            var r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "hjasbdn2ih823rgwudsde7e2dhsdhas";
            "string" == typeof r && (r = [].map.call(r, function (t) {
                return t.charCodeAt(0)
            }));
            for (var n, o = [], i = 0, a = new t(e.length), s = 0; s < 256; s++)
                o[s] = s;
            for (s = 0; s < 256; s++)
                i = (i + o[s] + r[s % r.length]) % 256,
                    n = o[s],
                    o[s] = o[i],
                    o[i] = n;
            s = 0,
                i = 0;
            for (var u = 0; u < e.length; u++)
                s = (s + 1) % 256,
                    i = (i + o[s]) % 256,
                    n = o[s],
                    o[s] = o[i],
                    o[i] = n,
                    a[u] = e[u] ^ o[(o[s] + o[i]) % 256];
            return a
        }
    },
    "getRealUID": function (t) {
        if (t >= p.start) {
            var e = p.end - p.start;
            if (t < p.end)
                return t + e;
            if (t < p.end + e)
                return t - e
        }
        return t
    },
    "getType": function o(t) {
        return Object.prototype.toString.call(t).slice(8, -1)
    }

}

function from_a(t, e, r, n) {  // 2  38  51  65
    return false ? h(t, e, r, n) : "string" == typeof e ? f(t, e, r) : p(t, e)
}

function f(t, e, r) {  // 3  5  18  22  37  52  54  58  62  64
    var n = 0 | y(e, r);
    t = o_19(t, n);
    var a = write(t, e, r);
    return a !== n && (t = t.slice(0, a)),
        t
}

function y(t, e) {  // 6  8  17  55  57
    if (false)
        return t.length;
    if (false)
        return t.byteLength;
    "string" != typeof t && (t = "" + t);
    var r = t.length;
    if (0 === r)
        return 0;
    for (var n = !1; ;)
        switch (e) {
            case "ascii":
            case "latin1":
            case "binary":
                return r;
            case "utf8":
            case "utf-8":
            case void 0:
                return Y(t).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
                return 2 * r;
            case "hex":
                return r >>> 1;
            case "base64":
                return V(t).length;
            default:
                if (n)
                    return Y(t).length;
                e = ("" + e).toLowerCase(),
                    n = !0
        }
}

function toByteArray(t) {  // 13  30  32
    var f = {
        43: 62,
        45: 62,
        47: 63,
        48: 52,
        49: 53,
        50: 54,
        51: 55,
        52: 56,
        53: 57,
        54: 58,
        55: 59,
        56: 60,
        57: 61,
        65: 0,
        66: 1,
        67: 2,
        68: 3,
        69: 4,
        70: 5,
        71: 6,
        72: 7,
        73: 8,
        74: 9,
        75: 10,
        76: 11,
        77: 12,
        78: 13,
        79: 14,
        80: 15,
        81: 16,
        82: 17,
        83: 18,
        84: 19,
        85: 20,
        86: 21,
        87: 22,
        88: 23,
        89: 24,
        90: 25,
        95: 63,
        97: 26,
        98: 27,
        99: 28,
        100: 29,
        101: 30,
        102: 31,
        103: 32,
        104: 33,
        105: 34,
        106: 35,
        107: 36,
        108: 37,
        109: 38,
        110: 39,
        111: 40,
        112: 41,
        113: 42,
        114: 43,
        115: 44,
        116: 45,
        117: 46,
        118: 47,
        119: 48,
        120: 49,
        121: 50,
        122: 51,
    }
    var e, r, o, i, a, s, u = t.length;
    a = n_is_4(t),
        s = new Uint8Array(3 * u / 4 - a),
        o = a > 0 ? u - 4 : u;
    var c = 0;
    for (e = 0,
        r = 0; e < o; e += 4,
        r += 3)
        i = f[t.charCodeAt(e)] << 18 | f[t.charCodeAt(e + 1)] << 12 | f[t.charCodeAt(e + 2)] << 6 | f[t.charCodeAt(e + 3)],
            s[c++] = i >> 16 & 255,
            s[c++] = i >> 8 & 255,
            s[c++] = 255 & i;
    return 2 === a ? (i = f[t.charCodeAt(e)] << 2 | f[t.charCodeAt(e + 1)] >> 4,
        s[c++] = 255 & i) : 1 === a && (i = f[t.charCodeAt(e)] << 10 | f[t.charCodeAt(e + 1)] << 4 | f[t.charCodeAt(e + 2)] >> 2,
            s[c++] = i >> 8 & 255,
            s[c++] = 255 & i),
        s
}

function V(t) {  // 9  13  16  25  29  33
    return toByteArray(q(t))
}

function q(t) {  // 10  12  26  28
    if (t = z(t).replace(/[^+\/0-9A-Za-z-_]/g, ""),
        t.length < 2)
        return "";
    for (; t.length % 4 != 0;)
        t += "=";
    return t
}

function z(t) {  // 11  27
    return t.trim ? t.trim() : t.replace(/^\s+|\s+$/g, "")
}

function n_is_4(t) {  // 14  31
    var e = t.length;
    if (e % 4 > 0)
        throw new Error("Invalid string. Length must be a multiple of 4");
    return "=" === t[e - 2] ? 2 : "=" === t[e - 1] ? 1 : 0
}

function i(t) {  // 15
    var e, r, o, i, a, s, u = t.length;
    a = n(t),
        s = new Uint8Array(3 * u / 4 - a),
        o = a > 0 ? u - 4 : u;
    var c = 0;
    for (e = 0,
        r = 0; e < o; e += 4,
        r += 3)
        i = f[t.charCodeAt(e)] << 18 | f[t.charCodeAt(e + 1)] << 12 | f[t.charCodeAt(e + 2)] << 6 | f[t.charCodeAt(e + 3)],
            s[c++] = i >> 16 & 255,
            s[c++] = i >> 8 & 255,
            s[c++] = 255 & i;
    return 2 === a ? (i = f[t.charCodeAt(e)] << 2 | f[t.charCodeAt(e + 1)] >> 4,
        s[c++] = 255 & i) : 1 === a && (i = f[t.charCodeAt(e)] << 10 | f[t.charCodeAt(e + 1)] << 4 | f[t.charCodeAt(e + 2)] >> 2,
            s[c++] = i >> 8 & 255,
            s[c++] = 255 & i),
        s
}

function o_19(t, e) {  // 19  21  59  61
    return true ? (t = new Uint8Array(e),
        t.__proto__ = Uint8Array.prototype) : (null === t && (t = new i(e)),
            t.length = e),
        t
}

function Y(t, e) {
    e = e || 1 / 0;
    for (var r, n = t.length, o = null, i = [], a = 0; a < n; ++a) {
        if ((r = t.charCodeAt(a)) > 55295 && r < 57344) {
            if (!o) {
                if (r > 56319) {
                    (e -= 3) > -1 && i.push(239, 191, 189);
                    continue
                }
                if (a + 1 === n) {
                    (e -= 3) > -1 && i.push(239, 191, 189);
                    continue
                }
                o = r;
                continue
            }
            if (r < 56320) {
                (e -= 3) > -1 && i.push(239, 191, 189),
                    o = r;
                continue
            }
            r = 65536 + (o - 55296 << 10 | r - 56320)
        } else
            o && (e -= 3) > -1 && i.push(239, 191, 189);
        if (o = null,
            r < 128) {
            if ((e -= 1) < 0)
                break;
            i.push(r)
        } else if (r < 2048) {
            if ((e -= 2) < 0)
                break;
            i.push(r >> 6 | 192, 63 & r | 128)
        } else if (r < 65536) {
            if ((e -= 3) < 0)
                break;
            i.push(r >> 12 | 224, r >> 6 & 63 | 128, 63 & r | 128)
        } else {
            if (!(r < 1114112))
                throw new Error("Invalid code point");
            if ((e -= 4) < 0)
                break;
            i.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, 63 & r | 128)
        }
    }
    return i
}

function write_E(t, e, r, n) {
    return X(Y(e, t.length - r), t, r, n)
}

function write(k, t, e, r, n) {  // 23  37  63
    if (void 0 === e)
        n = "utf8",
            r = k.length,
            e = 0;
    else if (void 0 === r && "string" == typeof e)
        n = e,
            r = k.length,
            e = 0;
    else {
        if (!isFinite(e))
            throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        e |= 0,
            isFinite(r) ? (r |= 0,
                void 0 === n && (n = "utf8")) : (n = r,
                    r = void 0)
    }
    var o = k.length - e;
    if ((void 0 === r || r > o) && (r = o),
        t.length > 0 && (r < 0 || e < 0) || e > this.length)
        throw new RangeError("Attempt to write outside buffer bounds");
    n || (n = "utf8");
    for (var i = !1; ;)
        switch (n) {
            case "hex":
                return _(k, t, e, r);
            case "utf8":
            case "utf-8":
                return write_E(k, t, e, r);
            case "ascii":
                return A(k, t, e, r);
            case "latin1":
            case "binary":
                return C(k, t, e, r);
            case "base64":
                return S_24(k, t, e, r);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
                return x(k, t, e, r);
            default:
                if (i)
                    throw new TypeError("Unknown encoding: " + n);
                n = ("" + n).toLowerCase(),
                    i = !0
        }
}

function S_24(t, e, r, n) {  // 24  34  36
    return X(V(e), t, r, n)
}

function X(t, e, r, n) {  // 35
    for (var o = 0; o < n && !(o + r >= e.length || o >= t.length); ++o)
        e[o + r] = t[o];
    return o
}

function a_slice(k, t, e) {  // 42  44  46  115  126  132  138  144  148
    var r = k.length;
    t = ~~t,
        e = void 0 === e ? r : ~~e,
        t < 0 ? (t += r) < 0 && (t = 0) : t > r && (t = r),
        e < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r),
        e < t && (e = t);
    var n;
    if (true)
        n = k.subarray(t, e),
            n.__proto__ = k.prototype;
    else {
        var o = e - t;
        n = new i(o, void 0);
        for (var a = 0; a < o; ++a)
            n[a] = this[a + t]
    }
    return n
}

function c(t, e) {
    if (undefined,
        t = o_19(t, e < 0 ? 0 : 0 | e),
        !true)
        for (var r = 0; r < e; ++r)
            t[r] = 0;
    return t
}

function allocUnsafe(t) {
    return c(null, t)
}

function a_68_copy(k, t, e, r, n) {
    if (r || (r = 0),
        n || 0 === n || (n = k.length),
        e >= t.length && (e = t.length),
        e || (e = 0),
        n > 0 && n < r && (n = r),
        n === r)
        return 0;
    if (0 === t.length || 0 === k.length)
        return 0;
    if (e < 0)
        throw new RangeError("targetStart out of bounds");
    if (r < 0 || r >= k.length)
        throw new RangeError("sourceStart out of bounds");
    if (n < 0)
        throw new RangeError("sourceEnd out of bounds");
    n > k.length && (n = k.length),
        t.length - e < n - r && (n = t.length - e + r);
    var o, a = n - r;
    if (k === t && r < e && e < n)
        for (o = a - 1; o >= 0; --o)
            t[o + e] = k[o + r];
    else if (a < 1e3 || !true)
        for (o = 0; o < a; ++o)
            t[o + e] = k[o + r];
    else
        Uint8Array.prototype.set.call(t, k.subarray(r, r + a), e);
    return a
}

function concat(t, e) {  // 48  68
    if (false)
        throw new TypeError('"list" argument must be an Array of Buffers');
    if (0 === t.length)
        return i.alloc(0);
    var r;
    if (void 0 === e)
        for (e = 0,
            r = 0; r < t.length; ++r)
            e += t[r].length;
    var n = allocUnsafe(e)
        , o = 0;
    for (r = 0; r < t.length; ++r) {
        var a = t[r];
        a_68_copy(a, n, o),
            o += a.length
    }
    return n
}

function a(e) {  // 70  92  94
    return "string" == typeof e && (e = t.from(e)),
        (0,
            h.default)(e, 41405).toString(16).replace(/^0+/, "")
}

function i_update(t, e, r) {
    if (!(true || this instanceof i_update))
        return new i(t, e, r);
    if ("number" == typeof t) {
        if ("string" == typeof e)
            throw new Error("If encoding is specified then the first argument must be a string");
        return c(this, t)
    }
    return a_g_Bt(this, t, e, r)
}

function r_e(n) {
    if (r[n])
        return r[n].exports;
    var o = r[n] = {
        i: n,
        l: !1,
        exports: {}
    };
    return t[n].call(o.exports, o, o.exports, e),
        o.l = !0,
        o.exports
}

function update(kkk, t) {  // 88
    var r, o = "string" == typeof t;
    o && (t = n(t),
        o = !1,
        r = !0),
        "undefined" != typeof ArrayBuffer && t instanceof ArrayBuffer && (r = !0,
            t = new Uint8Array(t));
    var i = 0
        , c = t.length
        , f = i + c;
    if (0 == c)
        return kkk;
    if (kkk.total_len += c,
        0 == kkk.memsize && (kkk.memory = o ? "" : r ? new Uint8Array(32) : new i_update(32)),
        kkk.memsize + c < 32)
        return o ? kkk.memory += t : r ? kkk.memory.set(t.subarray(0, c), kkk.memsize) : a_68_copy(t, kkk.memory, kkk.memsize, 0, c),
            kkk.memsize += c,
            kkk;
    if (kkk.memsize > 0) {
        o ? kkk.memory += t.slice(0, 32 - kkk.memsize) : r ? kkk.memory.set(t.subarray(0, 32 - kkk.memsize), kkk.memsize) : t.copy(kkk.memory, kkk.memsize, 0, 32 - kkk.memsize);
        var l = 0;
        if (o) {
            var h;
            h = a(kkk.memory.charCodeAt(l + 1) << 8 | kkk.memory.charCodeAt(l), kkk.memory.charCodeAt(l + 3) << 8 | kkk.memory.charCodeAt(l + 2), kkk.memory.charCodeAt(l + 5) << 8 | kkk.memory.charCodeAt(l + 4), kkk.memory.charCodeAt(l + 7) << 8 | kkk.memory.charCodeAt(l + 6)),
                kkk.v1.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory.charCodeAt(l + 1) << 8 | kkk.memory.charCodeAt(l), kkk.memory.charCodeAt(l + 3) << 8 | kkk.memory.charCodeAt(l + 2), kkk.memory.charCodeAt(l + 5) << 8 | kkk.memory.charCodeAt(l + 4), kkk.memory.charCodeAt(l + 7) << 8 | kkk.memory.charCodeAt(l + 6)),
                kkk.v2.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory.charCodeAt(l + 1) << 8 | kkk.memory.charCodeAt(l), kkk.memory.charCodeAt(l + 3) << 8 | kkk.memory.charCodeAt(l + 2), kkk.memory.charCodeAt(l + 5) << 8 | kkk.memory.charCodeAt(l + 4), kkk.memory.charCodeAt(l + 7) << 8 | kkk.memory.charCodeAt(l + 6)),
                kkk.v3.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory.charCodeAt(l + 1) << 8 | kkk.memory.charCodeAt(l), kkk.memory.charCodeAt(l + 3) << 8 | kkk.memory.charCodeAt(l + 2), kkk.memory.charCodeAt(l + 5) << 8 | kkk.memory.charCodeAt(l + 4), kkk.memory.charCodeAt(l + 7) << 8 | kkk.memory.charCodeAt(l + 6)),
                kkk.v4.add(h.multiply(u)).rotl(31).multiply(s)
        } else {
            var h;
            h = a(kkk.memory[l + 1] << 8 | kkk.memory[l], kkk.memory[l + 3] << 8 | kkk.memory[l + 2], kkk.memory[l + 5] << 8 | kkk.memory[l + 4], kkk.memory[l + 7] << 8 | kkk.memory[l + 6]),
                kkk.v1.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory[l + 1] << 8 | kkk.memory[l], kkk.memory[l + 3] << 8 | kkk.memory[l + 2], kkk.memory[l + 5] << 8 | kkk.memory[l + 4], kkk.memory[l + 7] << 8 | kkk.memory[l + 6]),
                kkk.v2.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory[l + 1] << 8 | kkk.memory[l], kkk.memory[l + 3] << 8 | kkk.memory[l + 2], kkk.memory[l + 5] << 8 | kkk.memory[l + 4], kkk.memory[l + 7] << 8 | kkk.memory[l + 6]),
                kkk.v3.add(h.multiply(u)).rotl(31).multiply(s),
                l += 8,
                h = a(kkk.memory[l + 1] << 8 | kkk.memory[l], kkk.memory[l + 3] << 8 | kkk.memory[l + 2], kkk.memory[l + 5] << 8 | kkk.memory[l + 4], kkk.memory[l + 7] << 8 | kkk.memory[l + 6]),
                kkk.v4.add(h.multiply(u)).rotl(31).multiply(s)
        }
        i += 32 - kkk.memsize,
            kkk.memsize = 0,
            o && (kkk.memory = "")
    }
    if (i <= f - 32) {
        var p = f - 32;
        do {
            if (o) {
                var h;
                h = a(t.charCodeAt(i + 1) << 8 | t.charCodeAt(i), t.charCodeAt(i + 3) << 8 | t.charCodeAt(i + 2), t.charCodeAt(i + 5) << 8 | t.charCodeAt(i + 4), t.charCodeAt(i + 7) << 8 | t.charCodeAt(i + 6)),
                    kkk.v1.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t.charCodeAt(i + 1) << 8 | t.charCodeAt(i), t.charCodeAt(i + 3) << 8 | t.charCodeAt(i + 2), t.charCodeAt(i + 5) << 8 | t.charCodeAt(i + 4), t.charCodeAt(i + 7) << 8 | t.charCodeAt(i + 6)),
                    kkk.v2.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t.charCodeAt(i + 1) << 8 | t.charCodeAt(i), t.charCodeAt(i + 3) << 8 | t.charCodeAt(i + 2), t.charCodeAt(i + 5) << 8 | t.charCodeAt(i + 4), t.charCodeAt(i + 7) << 8 | t.charCodeAt(i + 6)),
                    kkk.v3.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t.charCodeAt(i + 1) << 8 | t.charCodeAt(i), t.charCodeAt(i + 3) << 8 | t.charCodeAt(i + 2), t.charCodeAt(i + 5) << 8 | t.charCodeAt(i + 4), t.charCodeAt(i + 7) << 8 | t.charCodeAt(i + 6)),
                    kkk.v4.add(h.multiply(u)).rotl(31).multiply(s)
            } else {
                var h;
                h = a(t[i + 1] << 8 | t[i], t[i + 3] << 8 | t[i + 2], t[i + 5] << 8 | t[i + 4], t[i + 7] << 8 | t[i + 6]),
                    kkk.v1.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t[i + 1] << 8 | t[i], t[i + 3] << 8 | t[i + 2], t[i + 5] << 8 | t[i + 4], t[i + 7] << 8 | t[i + 6]),
                    kkk.v2.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t[i + 1] << 8 | t[i], t[i + 3] << 8 | t[i + 2], t[i + 5] << 8 | t[i + 4], t[i + 7] << 8 | t[i + 6]),
                    kkk.v3.add(h.multiply(u)).rotl(31).multiply(s),
                    i += 8,
                    h = a(t[i + 1] << 8 | t[i], t[i + 3] << 8 | t[i + 2], t[i + 5] << 8 | t[i + 4], t[i + 7] << 8 | t[i + 6]),
                    kkk.v4.add(h.multiply(u)).rotl(31).multiply(s)
            }
            i += 8
        } while (i <= p)
    }
    return i < f && (o ? kkk.memory += t.slice(i) : r ? kkk.memory.set(t.subarray(i, f), kkk.memsize) : t.copy(kkk.memory, kkk.memsize, i, f),
        kkk.memsize = f - i),
        kkk
}

function digest(kkk) {  // 90
    var a = i_i  // 这些加密数据有用
        , s = a("11400714785074694791")
        , u = a("14029467366897019727")
        , c = a("1609587929392839161")
        , f = a("9650029242287828579")
        , l = a("2870177450012600261");

    var t, e, r = kkk.memory, n = "string" == typeof r, o = 0, i = kkk.memsize, h = new i_i;
    for (kkk.total_len >= 32 ? (t = kkk.v1.clone().rotl(1),
        t.add(kkk.v2.clone().rotl(7)),
        t.add(kkk.v3.clone().rotl(12)),
        t.add(kkk.v4.clone().rotl(18)),
        t.xor(kkk.v1.multiply(u).rotl(31).multiply(s)),
        t.multiply(s).add(f),
        t.xor(kkk.v2.multiply(u).rotl(31).multiply(s)),
        t.multiply(s).add(f),
        t.xor(kkk.v3.multiply(u).rotl(31).multiply(s)),
        t.multiply(s).add(f),
        t.xor(kkk.v4.multiply(u).rotl(31).multiply(s)),
        t.multiply(s).add(f)) : t = add(kkk.seed.clone(), l),
        add(t, s_this(kkk.total_len, h)); o <= i - 8;)
        n ? a_a.call(h, r.charCodeAt(o + 1) << 8 | r.charCodeAt(o), r.charCodeAt(o + 3) << 8 | r.charCodeAt(o + 2), r.charCodeAt(o + 5) << 8 | r.charCodeAt(o + 4), r.charCodeAt(o + 7) << 8 | r.charCodeAt(o + 6)) : a_a.call(h, r[o + 1] << 8 | r[o], r[o + 3] << 8 | r[o + 2], r[o + 5] << 8 | r[o + 4], r[o + 7] << 8 | r[o + 6]),
            multiply(rotl.call(multiply(h, u), 31), s),
            add(multiply(rotl.call(xor.call(t, h), 27), s), f),
            o += 8;
    for (o + 4 <= i && (n ? h.fromBits(r.charCodeAt(o + 1) << 8 | r.charCodeAt(o), r.charCodeAt(o + 3) << 8 | r.charCodeAt(o + 2), 0, 0) : h.fromBits(r[o + 1] << 8 | r[o], r[o + 3] << 8 | r[o + 2], 0, 0),
        t.xor(multiply(h, s)).rotl(23).multiply(u).add(c),
        o += 4); o < i;)
        h.fromBits(n ? r.charCodeAt(o++) : r[o++], 0, 0, 0),
            t.xor(h.multiply(l)).rotl(11).multiply(s);
    return e = shiftRight.call(clone.call(t), 33),
        multiply(xor.call(t, e), u),
        e = shiftRight.call(clone.call(t), 29),
        multiply(xor.call(t, e), c),
        e = shiftRight.call(clone.call(t), 32),
        xor.call(t, e),
        i_this.call(kkk, kkk.seed),
        t
}

function clone() {
    return new i_i(this._a00, this._a16, this._a32, this._a48)
}

function shiftRight(t) {
    return t %= 64,
        t >= 48 ? (this._a00 = this._a48 >> t - 48,
            this._a16 = 0,
            this._a32 = 0,
            this._a48 = 0) : t >= 32 ? (t -= 32,
                this._a00 = 65535 & (this._a32 >> t | this._a48 << 16 - t),
                this._a16 = this._a48 >> t & 65535,
                this._a32 = 0,
                this._a48 = 0) : t >= 16 ? (t -= 16,
                    this._a00 = 65535 & (this._a16 >> t | this._a32 << 16 - t),
                    this._a16 = 65535 & (this._a32 >> t | this._a48 << 16 - t),
                    this._a32 = this._a48 >> t & 65535,
                    this._a48 = 0) : (this._a00 = 65535 & (this._a00 >> t | this._a16 << 16 - t),
                        this._a16 = 65535 & (this._a16 >> t | this._a32 << 16 - t),
                        this._a32 = 65535 & (this._a32 >> t | this._a48 << 16 - t),
                        this._a48 = this._a48 >> t & 65535),
        this
}

function o_default() {  // 71  87  89  91
    return 2 == arguments.length ? digest(update(new o_default(arguments[1]), arguments[0])) : this instanceof o_default ? void i_this.call(this, arguments[0]) : new o(arguments[0])
}

function i_this(t) {  // 72
    var s = { 'remainder': null, '_a00': 51847, '_a16': 34283, '_a32': 31153, '_a48': 40503, 'clone': function () { return new i_i(this._a00, this._a16, this._a32, this._a48) } }
    var u = { 'remainder': null, '_a00': 60239, '_a16': 10196, '_a32': 44605, '_a48': 49842 }
    return this.seed = new i_a(t),
        this.v1 = add(add(this.seed.clone(), s), u),
        this.v2 = add(this.seed.clone(), u),
        this.v3 = this.seed.clone(),
        this.v4 = subtract(this.seed.clone(), s),
        this.total_len = 0,
        this.memsize = 0,
        this.memory = null,
        this
}

function subtract(a, t) {
    return add(a, negate(clone.call(t)))
}

function negate(a) {
    var t = 1 + (65535 & ~a._a00);
    return a._a00 = 65535 & t,
        t = (65535 & ~a._a16) + (t >>> 16),
        a._a16 = 65535 & t,
        t = (65535 & ~a._a32) + (t >>> 16),
        a._a32 = 65535 & t,
        a._a48 = ~a._a48 + (t >>> 16) & 65535,
        a
}

function i_i(t, e, r, n) {
    return this instanceof i_i ? (this.remainder = null,
        "string" == typeof t ? i_u.call(this, t, e) : void 0 === e ? s_this.call(this, t) : void a_a.apply(this, arguments)) : new i_i(t, e, r, n)
}

function i_u(t, e) {
    e = e || 10,
        this._a00 = 0,
        this._a16 = 0,
        this._a32 = 0,
        this._a48 = 0;
    for (var r = c[e] || new i_i(Math.pow(e, 5)), n = 0, o = t.length; n < o; n += 5) {
        var a = Math.min(5, o - n)
            , s = parseInt(t.slice(n, n + a), e);
        add(multiply(this, a < 5 ? new i_i(Math.pow(e, a)) : r), new i_i(s))
    }
    return this
}

function multiply(k, t) {
    var e = k._a00
        , r = k._a16
        , n = k._a32
        , o = k._a48
        , i = t._a00
        , a = t._a16
        , s = t._a32
        , u = t._a48
        , c = e * i
        , f = c >>> 16;
    f += e * a;
    var l = f >>> 16;
    f &= 65535,
        f += r * i,
        l += f >>> 16,
        l += e * s;
    var h = l >>> 16;
    return l &= 65535,
        l += r * a,
        h += l >>> 16,
        l &= 65535,
        l += n * i,
        h += l >>> 16,
        h += e * u,
        h &= 65535,
        h += r * s,
        h &= 65535,
        h += n * a,
        h &= 65535,
        h += o * i,
        k._a00 = 65535 & c,
        k._a16 = 65535 & f,
        k._a32 = 65535 & l,
        k._a48 = 65535 & h,
        k
}

function i_a(t, e, r, n) {  // 73  75  78  80
    return this.remainder = null,
        this._a00 = 65535 & t,
        this._a16 = t >>> 16,
        this._a32 = 0,
        this._a48 = 0,
        this.clone = function () {  // 77  81
            return new i_i(this._a00, this._a16, this._a32, this._a48)
        },
        this
}

function s_this(t, k) {  // 74
    if (k)
        return k._a00 = 65535 & t,
            k._a16 = t >>> 16,
            k._a32 = 0,
            k._a48 = 0,
            k
    return this._a00 = 65535 & t,
        this._a16 = t >>> 16,
        this._a32 = 0,
        this._a48 = 0,
        this
}

function rotl(t) {
    if (0 == (t %= 64))
        return this;
    if (t >= 32) {
        var e = this._a00;
        if (this._a00 = this._a32,
            this._a32 = e,
            e = this._a48,
            this._a48 = this._a16,
            this._a16 = e,
            32 == t)
            return this;
        t -= 32
    }
    var r = this._a48 << 16 | this._a32
        , n = this._a16 << 16 | this._a00
        , o = r << t | n >>> 32 - t
        , i = n << t | r >>> 32 - t;
    return this._a00 = 65535 & i,
        this._a16 = i >>> 16,
        this._a32 = 65535 & o,
        this._a48 = o >>> 16,
        this
}

function xor(t) {
    return this._a00 ^= t._a00,
        this._a16 ^= t._a16,
        this._a32 ^= t._a32,
        this._a48 ^= t._a48,
        this
}

function a_a(t, e, r, n) {  // 79
    return void 0 === r ? (this._a00 = 65535 & t,
        this._a16 = t >>> 16,
        this._a32 = 65535 & e,
        this._a48 = e >>> 16,
        this) : (this._a00 = 0 | t,
            this._a16 = 0 | e,
            this._a32 = 0 | r,
            this._a48 = 0 | n,
            this)
}

function add(a, t) {  // 83  85
    var e = a._a00 + t._a00
        , r = e >>> 16;
    r += a._a16 + t._a16;
    var n = r >>> 16;
    n += a._a32 + t._a32;
    var o = n >>> 16;
    return o += a._a48 + t._a48,
        a._a00 = 65535 & e,
        a._a16 = 65535 & r,
        a._a32 = 65535 & n,
        a._a48 = 65535 & o,
        a
}

function r_decrypt(e) {
    var r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "hjasbdn2ih823rgwudsde7e2dhsdhas";
    "string" == typeof r && (r = [].map.call(r, function (t) {
        return t.charCodeAt(0)
    }));
    for (var n, o = [], i = 0, a = new i_update(e.length), s = 0; s < 256; s++)
        o[s] = s;
    for (s = 0; s < 256; s++)
        i = (i + o[s] + r[s % r.length]) % 256,
            n = o[s],
            o[s] = o[i],
            o[i] = n;
    s = 0,
        i = 0;
    for (var u = 0; u < e.length; u++)
        s = (s + 1) % 256,
            i = (i + o[s]) % 256,
            n = o[s],
            o[s] = o[i],
            o[i] = n,
            a[u] = e[u] ^ o[(o[s] + o[i]) % 256];
    return a
}

function Bt(t) {
    var e = {}
    e.maxObjectSize = 1e8,
        e.maxObjectCount = 32768,
        e.parseFile = function (t, e) {
            function r(t) {
                var r, n = null;
                try {
                    r = parseBuffer(t)
                } catch (t) {
                    n = t
                }
                e(n, r)
            }
            return n.isBuffer(t) ? r(t) : void f.readFile(t, function (t, n) {
                return t ? e(t) : void r(n)
            })
        }
    function r(e) {
        var r = x[e]
            , n = t[r]
            , o = (240 & n) >> 4
            , i = 15 & n
            , a = {
                offset: r,
                type: n,
                objType: o,
                objInfo: i,
                tableOffset: e
            };
        switch (o) {
            case 0:
                return f(a);
            case 1:
                return h(a);
            case 8:
                return p(a);
            case 2:
                return d(a);
            case 3:
                return m(a);
            case 6:
                return y(a);
            case 4:
                return g(a);
            case 5:
                return g(a, !0);
            case 10:
                return v(a);
            case 13:
                return b(a);
            default:
                throw new Error(2, o.toString(16))
        }
    }
    function f(t) {
        var e = t.objInfo
            , r = t.objType;
        switch (e) {
            case 0:
                return null;
            case 8:
                return !1;
            case 9:
                return !0;
            case 15:
                return null;
            default:
                throw new Error(3, r.toString(16))
        }
    }
    function h(r) {
        var n = r.offset
            , o = r.objInfo
            , i = Math.pow(2, o);
        if (i > 4)
            return u_h_Bt(a_slice(t, n + 1, n + 1 + i));
        if (i < e.maxObjectSize)
            return a_h_Bt(a_slice(t, n + 1, n + 1 + i));
        throw new Error("4 " + i + " " + e.maxObjectSize)
    }
    function p(r) {
        var n = r.offset
            , a = r.objInfo
            , s = a;
        if (s < e.maxObjectSize)
            return o({}, l, i(t.slice(n + 1, n + 1 + s)));
        throw new Error("4 " + s + " " + e.maxObjectSize)
    }
    function d(r) {
        var n = r.offset
            , o = r.objInfo
            , i = Math.pow(2, o);
        if (!(i < e.maxObjectSize))
            throw new Error("4 " + i + " " + e.maxObjectSize);
        var a = t.slice(n + 1, n + 1 + i);
        return 4 === i ? readFloatBE.call(a, 0) : 8 === i ? readDoubleBE.call(a, 0) : void 0
    }
    function m(e) {
        var r = e.offset
            , n = e.objInfo;
        3 != n && console.error(5, n);
        var o = t.slice(r + 1, r + 9);
        return new Date(9783072e5 + 1e3 * o.readDoubleBE(0))
    }
    function y(r) {
        var n = r.offset
            , o = r.objInfo
            , a = 1
            , s = o;
        if (15 == o) {
            var u = t[n + 1]
                , c = (240 & u) / 16;
            1 != c && console.error(6, c);
            var f = 15 & u
                , l = Math.pow(2, f);
            a = 2 + l,
                s = i(t.slice(n + 2, n + 2 + l))
        }
        if (s < e.maxObjectSize)
            return t.slice(n + a, n + a + s);
        throw new Error("4 " + s + " " + e.maxObjectSize)
    }
    function g(r, o) {
        var a = r.offset
            , s = r.objInfo;
        o = o || 0;
        var u = "utf8"
            , f = s
            , l = 1;
        if (15 == s) {
            var h = t[a + 1]
                , p = (240 & h) / 16;
            if (1 != p)
                throw new Error("7 " + p);
            var d = 15 & h
                , m = Math.pow(2, d);
            l = 2 + m,
                f = i_Bt(a_slice(t, a + 2, a + 2 + m))
        }
        if ((f *= o + 1) < e.maxObjectSize) {
            var y = new i_update(a_slice(t, a + l, a + l + f));
            return o && (y = c_g_Bt(y),
                u = "ucs2"),
                to_string_g_Bt.call(y, u)
        }
        throw new Error("4 " + f + " " + e.maxObjectSize)
    }
    function v(n) {
        var o = n.offset
            , a = n.objInfo
            , s = a
            , u = 1;
        if (15 == a) {
            var c = t[o + 1]
                , f = (240 & c) / 16;
            var l = 15 & c
                , h = Math.pow(2, l);
            u = 2 + h,
                s = i_Bt(a_slice(t, o + 2, o + 2 + h))
        }
        for (var p = [], d = 0; d < s; d++) {
            var m = i_Bt(a_slice(t, o + u + d * E, o + u + (d + 1) * E));
            p[d] = r(m)
        }
        return p
    }
    function b(n) {
        var o = n.offset
            , a = n.objInfo
            , s = (n.tableOffset,
                a)
            , u = 1;
        if (15 == a) {
            var c = t[o + 1]
                , f = (240 & c) / 16;
            1 != f && console.error(9, f);
            var l = 15 & c
                , h = Math.pow(2, l);
            u = 2 + h,
                s = i(a_slice(t, o + 2, o + 2 + h))
        }
        if (2 * s * E > e.maxObjectSize)
            throw new Error(4);
        for (var p = {}, d = 0; d < s; d++) {
            var m = i_Bt(a_slice(t, o + u + d * E, o + u + (d + 1) * E))
                , y = i_Bt(a_slice(t, o + u + s * E + d * E, o + u + s * E + (d + 1) * E))
                , g = r(m)
                , v = r(y);
            p[g] = v
        }
        return p
    }
    var w = a_slice(t, t.length - 32, t.length)
        , _ = readUInt8.call(w, 6)
        , E = readUInt8.call(w, 7)
        , A = s_Bt(w, 8)
        , C = s_Bt(w, 16)
        , S = s_Bt(w, 24);
    for (var x = [], O = 0; O < A; O++) {
        var T = a_slice(t, S + O * _, S + (O + 1) * _);
        x[O] = i_Bt(T, 0)
    }
    return r(C)
}

function readUInt8(t, e) {
    return this[t]
}

function s_Bt(t, e) {
    return readUInt32BE.call(a_slice(t, e, e + 8), 4, 8)
}

function readUInt32BE(t, e) {
    return e || I(t, 4, this.length),
        16777216 * this[t] + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3])
}

function i_Bt(t, e) {
    e = e || 0;
    for (var r = 0, n = e; n < t.length; n++)
        r <<= 8,
            r |= 255 & t[n];
    return r
}

function a_g_Bt(t, e, r, n) {
    if ("number" == typeof e)
        throw new TypeError('"value" argument must not be a number');
    return "undefined" != typeof ArrayBuffer && e instanceof ArrayBuffer ? h(t, e, r, n) : "string" == typeof e ? f(t, e, r) : p_a(t, e)
}

function p_a(t, e) {
    if (true) {
        var r = 0 | e.length;
        return t = o_19(t, r),
            0 === t.length ? t : (a_68_copy(e, t, 0, 0, r),
                t)
    }
    if (e) {
        if ("undefined" != typeof ArrayBuffer && e.buffer instanceof ArrayBuffer || "length" in e)
            return "number" != typeof e.length || G(e.length) ? o(t, 0) : l(t, e);
        if ("Buffer" === e.type && J(e.data))
            return l(t, e.data)
    }
    throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")
}

function c_g_Bt(t) {
    for (var e = t.length, r = 0; r < e; r += 2) {
        var n = t[r];
        t[r] = t[r + 1],
            t[r + 1] = n
    }
    return t
}

function to_string_g_Bt() {
    var t = 0 | this.length;
    return 0 === t ? "" : 0 === arguments.length ? T(this, 0, t) : g_to_string.apply(this, arguments)
}

function g_to_string(t, e, r) {
    var n = !1;
    if ((void 0 === e || e < 0) && (e = 0),
        e > this.length)
        return "";
    if ((void 0 === r || r > this.length) && (r = this.length),
        r <= 0)
        return "";
    if (r >>>= 0,
        e >>>= 0,
        r <= e)
        return "";
    for (t || (t = "utf8"); ;)
        switch (t) {
            case "hex":
                return N(this, e, r);
            case "utf8":
            case "utf-8":
                return T_g(this, e, r);
            case "ascii":
                return k(this, e, r);
            case "latin1":
            case "binary":
                return R(this, e, r);
            case "base64":
                return O(this, e, r);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
                return j_g(this, e, r);
            default:
                if (n)
                    throw new TypeError("Unknown encoding: " + t);
                t = (t + "").toLowerCase(),
                    n = !0
        }
}

function j_g(t, e, r) {
    for (var n = a_slice(t, e, r), o = "", i = 0; i < n.length; i += 2)
        o += String.fromCharCode(n[i] + 256 * n[i + 1]);
    return o
}

function T_g(t, e, r) {
    r = Math.min(t.length, r);
    for (var n = [], o = e; o < r;) {
        var i = t[o]
            , a = null
            , s = i > 239 ? 4 : i > 223 ? 3 : i > 191 ? 2 : 1;
        if (o + s <= r) {
            var u, c, f, l;
            switch (s) {
                case 1:
                    i < 128 && (a = i);
                    break;
                case 2:
                    u = t[o + 1],
                        128 == (192 & u) && (l = (31 & i) << 6 | 63 & u) > 127 && (a = l);
                    break;
                case 3:
                    u = t[o + 1],
                        c = t[o + 2],
                        128 == (192 & u) && 128 == (192 & c) && (l = (15 & i) << 12 | (63 & u) << 6 | 63 & c) > 2047 && (l < 55296 || l > 57343) && (a = l);
                    break;
                case 4:
                    u = t[o + 1],
                        c = t[o + 2],
                        f = t[o + 3],
                        128 == (192 & u) && 128 == (192 & c) && 128 == (192 & f) && (l = (15 & i) << 18 | (63 & u) << 12 | (63 & c) << 6 | 63 & f) > 65535 && l < 1114112 && (a = l)
            }
        }
        null === a ? (a = 65533,
            s = 1) : a > 65535 && (a -= 65536,
                n.push(a >>> 10 & 1023 | 55296),
                a = 56320 | 1023 & a),
            n.push(a),
            o += s
    }
    return P_T(n)
}

function P_T(t) {
    var e = t.length;
    if (e <= Q)
        return String.fromCharCode.apply(String, t);
    for (var r = "", n = 0; n < e;)
        r += String.fromCharCode.apply(String, a_slice(t, n, n += Q));
    return r
}

function a_h_Bt(t, e, r) {
    return e = e || 0,
        r = r || t.length - e,
        readIntBE.call(t, e, r)
}

function u_h_Bt(t, e) {
    return e = e || 0,
        readInt32BE.call(t.slice(e, e + 8), 4, 8)
}

function readIntBE(t, e, r) {
    t |= 0,
        e |= 0,
        r || undefined;
    for (var n = e, o = 1, i = this[t + --n]; n > 0 && (o *= 256);)
        i += this[t + --n] * o;
    return o *= 128,
        i >= o && (i -= Math.pow(2, 8 * e)),
        i
}

function readFloatBE(t, e) {
    return e || undefined,
        K.read(this, t, !1, 23, 4)
}

function readDoubleBE(t, e) {
    return e || undefined,
        K.read(this, t, !1, 52, 8)
}

function kt(t) {
    var i = Ut;
    function n(e) {
        if (1 === Object.keys(e).length && void 0 !== e[i.$UID])
            return o(e[i.$UID]);
        if (i.$vals in e) {
            var t = e[i.$keys]
                , n = e[i.$vals];
            return t ? t.reduce(function (e, t, i) {
                return e[o(t)] = r(n[i]),
                    e
            }, {}) : n.map(function (e) {
                return o(e)
            })
        }
        return Object.keys(e).reduce(function (t, n) {
            var o = e[n];
            return t[n] = r(o),
                t
        }, {})
    }
    function r(t) {
        return "Object" === (0,
            i.getType)(t) ? n(t) : "Array" === (0,
                i.getType)(t) ? t.map(function (e) {
                    return r(e)
                }) : t instanceof i_update ? (0 === t[t.length - 1] && (t = t.slice(0, t.length - 1)),
                    t.toString()) : t
    }
    function o(e) {
        return r(t[(0,
            i.getRealUID)(e)])
    }
    return o(arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : (0,
        i.getRealUID)(i.$defaultRootUID))
}

function n_n(r) {
    return e_e(t)(r_r)(r)
}

function e_e(e) {
    return function (e) {
        return function (t) {
            var n = Object.keys(t)[0]
                , r = Ut.crypto.decrypt(t[n], n);
            return e(r)
        }
    }
}

function r_r(r) {
    return e_e_decrypt(t)(e_e_decrypt_n)(r)
}

function e_e_decrypt(e) {
    return function (e) {
        return function (t) {
            return e(Bt(t))
        }
    }
}

function e_e_decrypt_n(r) {
    return playload(t)(e_playload)(r)
}

function playload(e) {
    return function (e) {
        return function (t) {
            return e({
                type: "INIT",
                payload: kt(t)
            })
        }
    }
}

function e_playload(r) {
    return r
}

function decrypt(r) {
    var a = encry2arr_from(r, "base64")  // 0
        , s = Math.max(Math.floor((a.length - 2 * i) / 3), 0)  // 40
        , u = a_slice(a, s, s + i);  // 41
    a = concat([a_slice(a, 0, s), a_slice(a, s + i)]);  // 43  45  47
    var c_data = hash(concat([u, encry2arr_from("")]));  // 49  67  69
    var l = {}
    l[c_data] = a
    var data = n_n((l = {}, l[c_data] = a, l))
    return data
}
