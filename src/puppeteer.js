const puppeteer = require('puppeteer');
const shuffle = require('shuffle-array');

let ops = require('../src/pouchDB');
let cnf = require('../config/config.json');
let logger = require('../log/logger');
let sendMail = require('./send-mail');

let run = async function () {

    // set up Puppeteer
    const browser = await puppeteer.launch({
        headless: process.env.NODE_ENV == 'production' ? cnf.settings.headless : false,
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1920, height: 1080 });

    // Load Instagram
    await page.goto('https://www.instagram.com');
    await page.waitFor(2500);
    await page.click(cnf.selectors.home_to_login_button);
    await page.waitFor(2500);

    // Login
    await page.click(cnf.selectors.username_field);
    await page.keyboard.type(process.env.username);
    await page.click(cnf.selectors.password_field);
    await page.keyboard.type(process.env.password);

    await page.click(cnf.selectors.login_button);
    await page.waitForNavigation();

    // Loop through shuffled hashtags
    let hashtags = shuffle(cnf.hashtags);
    let hashtagList = hashtags[Math.floor(Math.random() * 4)];

    var indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    let startDateTime = new Date(indiaTime);
    let startDate = startDateTime.toLocaleString().slice(0, 10);
    let startTime = startDateTime.toLocaleString().slice(10, 15);
    let totalLikes = 0;
    let totalComments = 0;
    let totalFollows = 0;

    sendMail.sendStartMail("rajasmart48@gmail.com,akhilkamesh97@gmail.com", "footballimpulse", startDate, startTime);

    for (let hl = 0; hl < hashtagList.length; hl++) {

        // Search for hashtags
        await page.goto('https://www.instagram.com/explore/tags/' + hashtagList[hl] + '/?hl=en');
        logger.info('==> Search for hashtag ' + hashtagList[hl]);

        let hashtagLikes = 0;
        let hashtagComments = 0;
        let hashtagFollows = 0;
        // Loop through the latest 24 posts (8 rows, 3 posts in each row)
        for (let r = 1; r < 9; r++) {
            for (let c = 1; c < 4; c++) {

                //Try to select post, wait, if successful continue
                let br = false;
                await page.click('section > main > article > div:nth-child(3) > div > div:nth-child(' + r + ') > div:nth-child(' + c + ') > a').catch(() => {
                    br = true;
                });
                await page.waitFor(2250 + Math.floor(Math.random() * 250));
                if (br) continue;

                // Get post info
                let hasEmptyHeart = await page.$(cnf.selectors.post_heart_grey);
                let hasEmptyComment = await page.$(cnf.selectors.post_comment_text_area);

                let username = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, cnf.selectors.post_username);

                logger.info('---> Evaluate for username ' + username);

                let followStatus = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, cnf.selectors.post_follow_link);

                // Decide to like post
                if (hasEmptyHeart !== null && Math.random() < cnf.settings.like_ratio) {
                    try {
                        await page.click(cnf.selectors.post_like_button);
                        logger.info('---> like for username ' + username);
                        hashtagLikes = hashtagLikes + 1;
                    } catch (err) {
                        logger.error('---> like error ' + err);
                    }
                    await page.waitFor(10000 + Math.floor(Math.random() * 2000));
                }

                // Decide to comment post
                // if (hasEmptyComment !== null && Math.random() < cnf.settings.comment_ratio) {
                //     try {
                //         await page.click(cnf.selectors.post_comment_text_area);
                //         let comment = shuffle(cnf.comments);
                //         let pageCommentTag = shuffle(cnf.page_comment_tags);
                //         let commentMessage = `${comment[Math.floor(Math.random() * 7)]} .... ${pageCommentTag[Math.floor(Math.random() * 3)]}`;
                //         await page.keyboard.type(commentMessage);
                //         await page.click(cnf.selectors.post_comment_button);
                //         logger.info('---> comment for username ' + username);
                //         hashtagComments = hashtagComments + 1;
                //     } catch (err) {
                //         logger.error('---> comment error ' + err);
                //     }
                //     await page.waitFor(10000 + Math.floor(Math.random() * 2000));
                // }


                // Decide to follow user
                let isArchivedUser;
                await ops.inArchive(username).then(() => isArchivedUser = true).catch(() => isArchivedUser = false);

                if (followStatus === 'Follow' && !isArchivedUser && Math.random() < cnf.settings.follow_ratio) {
                    await ops.addFollow(username).then(() => {
                        return page.click(cnf.selectors.post_follow_link);
                    }).then(() => {
                        logger.info('---> follow for ' + username);
                        hashtagFollows = hashtagFollows + 1;
                        return page.waitFor(10000 + Math.floor(Math.random() * 5000));
                    }).catch(() => {
                        logger.error('---> Already following ' + username);
                    });
                }

                // Close post
                await page.click(cnf.selectors.post_close_button).catch(() => logger.error(':::> Error closing post'));
            }
        }
        totalLikes = totalLikes + hashtagLikes;
        totalComments = totalComments + hashtagComments;
        totalFollows = totalFollows + hashtagFollows;
        logger.info(`==> Search for hashtag-complete ${hashtagList[hl]}, totalLikes : ${hashtagLikes}, totalFollows : ${hashtagFollows}, totalComments : ${hashtagComments}`);
    }

    indiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    let endDateTime = new Date(indiaTime);
    let endDate = endDateTime.toLocaleString().slice(0, 10);
    let endTime = endDateTime.toLocaleString().slice(10, 15);
    logger.info(`==> Job Complete :
     Start Date : ${startDate}, 
     Start Time : ${startTime},
     End Date : ${endDate},
     End Time : ${endTime},
     Total Likes : ${totalLikes},
     Total Comments : ${totalComments},
     Total Follows : ${totalFollows}`
    );
    sendMail.sendCompletionMail("rajasmart48@gmail.com,akhilkamesh97@gmail.com", "footballimpulse", startDate, endTime, totalLikes, totalComments, totalFollows);

    // Unfollows
    if (cnf.settings.do_unfollows) {

        let cutoff = new Date().getTime() - (cnf.settings.unfollow_after_days * 86400000);
        let follows = await ops.getFollows();
        let unfollows = [];

        follows.rows.forEach(user => {
            if (user.doc.added < cutoff) {
                unfollows.push(user.doc._id);
            }
        });

        for (let n = 0; n < unfollows.length; n++) {

            let user = unfollows[n];
            await page.goto('https://www.instagram.com/' + user + '/?hl=en');
            await page.waitFor(1500 + Math.floor(Math.random() * 500));
            let followersCount = await page.evaluate(x => {
                let element = document.querySelector(x);
                return Promise.resolve(element ? element.title : '');
            }, cnf.selectors.followers_count);
            logger.info('---> Followers count for ' + user + ' is ' + followersCount);
            if (followersCount != '' && Number(followersCount) < 1000) {
                let followStatus = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, cnf.selectors.user_unfollow_button);

                if (followStatus === 'Following') {
                    logger.info('---> unfollow ' + user);
                    await page.click(cnf.selectors.user_unfollow_button);
                    await page.waitFor(750);
                    await page.click(cnf.selectors.user_unfollow_confirm_button);
                    ops.unFollow(user);
                    await page.waitFor(15000 + Math.floor(Math.random() * 5000));
                } else {
                    logger.info('---> archive ' + user);
                    ops.unFollow(user);
                }
            }
        }

    }

    // Close browser
    browser.close();

};

module.exports = run;