import express from "express";
import { exec } from "child_process";
import _ from 'lodash';
import { log } from "console";


const app = express();

const executeCurlCommand = () => {
    return new Promise((resolve, reject) => {

        const curlCommand =
            'curl --request GET ' +
            '--url https://intent-kit-16.hasura.app/api/rest/blogs ' +
            '--header "x-hasura-admin-secret: 32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6"';

        exec(curlCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing curl command:', error);
                res.status(503).json({ error: 'Service temporarily unavailable' });
                reject(error);
                return;
            }

            try {
                // Parse the stdout as JSON
                const jsonData = JSON.parse(stdout); 
                resolve(jsonData["blogs"]);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
};

const memoizedExecuteCurlCommand = _.memoize(() => executeCurlCommand(), undefined, 300000);


app.get('/api/blog-stats', async (req, res) => {
    try {
        let result = await memoizedExecuteCurlCommand();
        
        const no_of_blogs = _.size(result);
        
        const blogWithLongestTitle = _.maxBy(result, (blog) => blog['title'].length);
        
        const blogsWithPrivacyKeyword
            = _.size(_.filter(result,
                (blog) => _.includes(blog.title.toLowerCase(), 'privacy')
            ));
        
        const uniqueTitles = _.uniqBy(result,'title').map((blog) => blog['title'])

        let response = {
            no_of_blogs,
            blogWithLongestTitle,
            blogsWithPrivacyKeyword,
            "uniqueTitles" : uniqueTitles
        }
        
        res.json(response)
        res.status(200)
        return res;
    } catch (error) {
        console.error('Error in /api/blog-stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.get('/api/blog-search', async (req, res) => {
    const query = req.query.query;
    
    try {
        const result = await memoizedExecuteCurlCommand();
        const queriedResult = _.filter(result , result =>  _.includes(result.title.toLowerCase(), query.toLowerCase()));
        console.log(queriedResult);
        res.json(queriedResult);
        res.status(200)
        return res;
    } catch (error) {
        console.error('Error in /api/blog-search:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})


app.listen(3000, () => {
    console.log("App Started on port 3000")
})

