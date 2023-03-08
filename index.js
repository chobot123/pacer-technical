const http = require('http');
const https = require('https');
const cheerio = require('cheerio');

async function main() {

    // try {
    //     const myUrl = new URL('https://www.wikipedia.org/');
    //     const webdata = await downloadWebPage(myUrl);
    //     const newLinks = getLinks(webdata.data, myUrl);
    //     var unique = [...new Set(newLinks)];
    //     console.table(unique);

    //     // const links = [];
    //     // const $ = cheerio.load(webdata.data);
    //     // const tests = $("a");
    //     // tests.each((index, element) => {
    //     //     links.push({
    //     //         text: $(element).text(), // get the text
    //     //         href: $(element).attr('href'), // get the href attribute
    //     //     });
    //     // })

    //     // const uniqueTests = [...new Set(links)];
    //     // console.log("lengths", unique.length, uniqueTests.length);
    // } catch (err) {
    //     console.error(err);
    // }

    try {
        const myUrl = new URL('https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes');
        const webdata = await downloadWebPage(myUrl);
        const newLinks = getAllLinks(webdata.data, myUrl);
        var uniqueLinks = [...new Set(newLinks)];
        console.table(uniqueLinks);
        // console.log(myUrl);
    } catch (err) {
        console.error(err);
    }
}
  
// function getLinks(dataString, url = "") {
//     var links = [];
//     var temp = dataString;
//     var i = 0;
//     while(i != -1) {
//         const aIndexStart = temp.indexOf("<a ");
//         if(aIndexStart == -1) break;
//         const aIndexEnd = temp.indexOf("</a", aIndexStart);
//         if(aIndexEnd == -1) break;
//         const aSubstr = temp.substring(aIndexStart, aIndexEnd + 3);
//         if(aSubstr.indexOf("<a") != -1) {}
//         const href = getHref(aSubstr, url);
//         if(href != -1) links.push(href);
//         i = aIndexEnd;
//         temp = temp.substring(i);
//     }
//     return links;
// }

function getAllLinks(dataString, url = "") {
    var links = [];
    var i = 0;
    const stringArr = dataString.split(" ");
    for(var i = 0; i < stringArr.length; i++) {
        const str = stringArr[i];
        var filteredLink = -1;
        if(str.indexOf(`href="`) !== -1)        filteredLink = filterLink(str, url, `href="`);
        else if(str.indexOf(`src="`) !== -1)    filteredLink = filterLink(str, url, `src="`);
        else if(str.indexOf(`srcset="`) !== -1) filteredLink = filterLink(str, url, `srcset="`);
        else if(str.indexOf(`data="`) !== -1)   filteredLink = filterLink(str, url, `data="`);
        else if(str.indexOf(`url="`) !== -1)    filteredLink = filterLink(str, url, `url="`);
        if(filteredLink != -1) links.push(filteredLink);
    }
    return links;
}

function filterLink(element, url, urlAttribute = `href="`) {
    const urlIndex = element.indexOf(urlAttribute);
    if(urlIndex == -1) return -1;
    const split = element.slice(urlIndex).split(`"`);
    if(split.length <= 1) return -1;
    var filteredLink = split[1];
    if(filteredLink.indexOf("http://") == -1 && filteredLink.indexOf("https://") == -1) {
        if(onlyNumOrChar(filteredLink)) return -1; //if only characters... fail test since routes must always(?) have special characters
        if(equalFirstChar(filteredLink, "/")) filteredLink = url.origin + filteredLink; //https:something.com + [/*]
        else if(equalFirstChar(filteredLink, "#")) filteredLink = url.href + filteredLink; //https:.......#[*]
        else if(equalFirstChar(filteredLink, ".")) filteredLink = url.href + filteredLink.slice(2); // ./#xxxx => [origin]/#....
        else if(onlyNumOrChar(filteredLink.at(0))) { //if first character not special characters listed above... fail test
            const urlSplit = url.href.split("/");
            urlSplit.pop();
            filteredLink = urlSplit.join("/") + "/" + filteredLink; //https://....../../../ + [*]
        } else return -1;
    }

    return filteredLink;
}

function onlyNumOrChar(testString) {
    return (/^[A-Za-z0-9]+$/.test(testString)) ? true : false;
}

function equalFirstChar(testString, testChar) {
    return (testString.at(0) == testChar) ? true : false;
}

//link == string
// function getHref(link, url) {
//     const start = link.indexOf("href");
//     if(start == -1) return -1;
//     const temp = link.substring(start); 
//     var split = temp.split(`"`);
//     if(split.length <= 1) return -1;
//     var href = split[1];
//     if(href.indexOf("http://") == -1 && href.indexOf("https://") == -1) {
//         if(href.at(0) == "/") href = url.origin + href; //https:something.com + [/*]
//         else if(href.at(0) == "#") href = url.href + href; //https:.......#[*]
//         else {
//             const hrefSplit = url.href.split("/");
//             hrefSplit.pop();

//             href = hrefSplit.join("/") + "/" + href; //https://....../../../ + [*]
//         }
//     }
//     return href;
// }

async function downloadWebPage(url, reattemptConnections = 0) {

    return new Promise((resolve, reject) => {
        const data = [];

        const options = {
            headers: {
                'User-Agent': "link getter github.com/chobot123"
            }
        }
        var protocol;
        if(url.protocol == "https:") protocol = https;
        else if(url.protocol == "http:") protocol = http;
        else {
            reject(
                {
                    statuscode: 501,
                    error: new Error("Url does not follow HTTP/HTTPS protocol and functionality beyond has not been imeplemented")
                }
            )
        }
        const req = protocol.request(url, options,
        res => {
            if((res.statusCode >= 300 && res.statusCode <= 399) && reattemptConnections < 5) {
                return downloadWebPage(res.headers.location, ++reattemptConnections).then(resolve);
            } else if(reattemptConnections >= 5) {
                reject(
                    {
                        statuscode: res.statusCode,
                        error: new Error("Redirections exceeded 5 attempts and has disconnected from socket")
                    }
                )
            }
            res.on('data', (d) => {
                data.push(d.toString());
            });
            res.on('end', () => {
                const pageData = data.join("");
                resolve(
                    {
                        statuscode: res.statusCode,
                        data: pageData
                    }
                );
            });
            res.on('error', (err) => {
                reject( 
                    {
                        statuscode: res.statusCode,
                        error: err
                    }
                );
            })
        }).end();
    });
}

main() 

module.exports = { downloadWebPage }