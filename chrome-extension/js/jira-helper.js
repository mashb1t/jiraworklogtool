(function(){
    var user = '';
    var headers = {
        "content-type": "application/json",
        "cache-control": "no-cache"
        //TODO: make sure no auth headers are needed. It seems the chrome extension gets the cookies for the domain automatically.
    };
    var jiraDomain = '';

    function searchForWorklogKeys(worklogDate){
        return new Promise((resolve, reject) =>{
            var fields = "fields=fields,key"
            var jql = `jql=worklogDate='${worklogDate}' AND worklogAuthor=currentUser()`;
            var url = jiraDomain + "/rest/api/2/search?" + fields + '&' + jql;
            
            var config = {
                'headers': headers,
                'method': 'GET',
                'url': url
            }
            request(config).then((response) => {
                var keys = [];
                for (var i = 0; i < response.issues.length; i++) {
                    var item = response.issues[i];
                    console.log(item.key);
                    keys.push(item.key);
                }
                resolve(keys);
            }).catch((error) => {
                reject(error);
            });
            
        });
    }
    
    function request(config){
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            
            xhr.addEventListener("readystatechange", (event) => {
                if (xhr.readyState === 4) {
                    if(xhr.status === 200 || xhr.status === 201 || xhr.status === 204){
                        //TODO: define better way to save user name, which will be used to filter the worklogs
                        user = xhr.getResponseHeader('X-AUSERNAME').toLowerCase();
                        var response = {};
                        if (xhr.responseText) {
                            response = JSON.parse(xhr.responseText);
                        }
                        resolve(response);
                    }else{
                        reject(xhr.statusText);
                    }
                }
            });
            
            xhr.open(config.method, config.url);

            for (header in config.headers) {
                xhr.setRequestHeader(header, config.headers[header]);   
            }
            if (config.data) 
                xhr.send(JSON.stringify(config.data));
            else
                xhr.send();
        });
    }

    function getDetailedWorklogFromIssue(key){
        var url = `${jiraDomain}/rest/api/2/issue/${key}/worklog`;
        var config = {
            'headers': headers,
            'method': 'GET',
            'url': url
        }
        return request(config);
    }

    function getWorklogObjects(key, worklogs){
        return new Promise((resolve, reject) => {
            
            console.log(`key: ${key}`,worklogs);
            var worklogObjectArray = [];
            worklogs.forEach((worklog)=> {
                worklogObjectArray.push({
                    'jira': key,
                    'timeSpent': worklog.timeSpent,
                    'comment': worklog.comment,
                    'started': worklog.started,
                    'logId': worklog.id,
                    'status': 'saved'
                });
            })
            console.log(worklogObjectArray);
            resolve(worklogObjectArray);
        });
    }

    function getDetailedWorklogs(keys, worklogDate){
        return new Promise((resolve, reject) =>{
            var promises = [];
            var worklogsObjectArray = [];
            keys.forEach((key) => {
                var responsePromise = getDetailedWorklogFromIssue(key);
                promises.push(responsePromise);
                
                responsePromise.then((response) => {
                    //filter worklogs by 'started' date and user author
                    var worklogs = response.worklogs.filter((worklog) => {
                        return worklog.started.indexOf(worklogDate) > -1 &&
                            worklog.author.key === user;
                    });
                    var promise = getWorklogObjects(key, worklogs);
                    promises.push(promise);
                    promise.then((arr) => {
                        worklogsObjectArray = worklogsObjectArray.concat(arr);
                    });
                });
            });
            Promise.all(promises).then(() => {
                resolve(worklogsObjectArray);
            })            
        });
    }

    function getWorklog(worklogDate){
        return searchForWorklogKeys(worklogDate).then((keys) => {
            return getDetailedWorklogs(keys,worklogDate);
        })
    }

    function logWork(worklog, date){
        //TODO: remove after testing request accuracy
        worklog = worklog || {
            //'started': '2017-11-21',
            'comment': 'general activities',
            'timeSpent': '15m', 
            'jira': 'CMS-246'
        }
        worklog.started = date + 'T06:00:00.075+0000'; //TODO: refactor to expected date format

        var url = `${jiraDomain}/rest/api/2/issue/${worklog.jira}/worklog`;
        var config = {
            'headers': headers,
            'method': 'POST',
            'url': url,
            'data': {
                'started': worklog.started,
                'comment': worklog.comment,
                'timeSpent': worklog.timeSpent
            }
        }
        return request(config).then(result => {
            return Promise.resolve(worklog);
        }).catch(error => {
            return Promise.reject(worklog);
        });
        //return Promise.resolve(worklog);
    }

    function updateWorklog(worklog){
        //TODO: remove after testing request accuracy
        // worklog = worklog || {
        //     //'started': '2017-11-21',
        //     comment: "daily and alignments with team",
        //     jira: "CMS-250",
        //     logId: "37733",
        //     timeSpent: "30m"
        // }

        worklog = {
            comment: worklog.comment,
            jira: worklog.jira,
            logId: worklog.logId,
            timeSpent: worklog.timeSpent,
        }
        //worklog.started = date + 'T06:00:00.075+0000'; //TODO: refactor to expected date format

        var url = `${jiraDomain}/rest/api/2/issue/${worklog.jira}/worklog/${worklog.logId}`;
        var config = {
            'headers': headers,
            'method': 'PUT',
            'url': url,
            'data': {
                'started': worklog.started,
                'comment': worklog.comment,
                'timeSpent': worklog.timeSpent
            }
        }
        return request(config).then(result => {
            return Promise.resolve(worklog);
        }).catch(error => {
            return Promise.reject(worklog);
        });
        //return Promise.resolve(worklog);
    }

    function deleteWorklog(worklog){
        //TODO: remove after testing request accuracy
        worklog = worklog || {
            //'started': '2017-11-21',
            jira: "CMS-250", 
            timeSpent: "30m", 
            comment: "team support", 
            started: "2017-11-23T23:10:00.000+0000", 
            logId: "38215"
        }

        worklog = {
            comment: worklog.comment,
            jira: worklog.jira,
            logId: worklog.logId,
            timeSpent: worklog.timeSpent,
        }
        //worklog.started = date + 'T06:00:00.075+0000'; //TODO: refactor to expected date format

        var url = `${jiraDomain}/rest/api/2/issue/${worklog.jira}/worklog/${worklog.logId}`;
        var config = {
            'headers': headers,
            'method': 'DELETE',
            'url': url
        }
        return request(config).then(result => {
            return Promise.resolve(worklog);
        }).catch(error => {
            return Promise.reject(worklog);
        });
        //return Promise.resolve(worklog);
    }

    function setJiraUrl(jiraUrl){
        jiraDomain = jiraUrl;
    }

    function bulkInsertWorklog(requestParams){

    }

    window.JiraHelper = {
        getWorklog : getWorklog,
        logWork: logWork,
        bulkInsertWorklog: bulkInsertWorklog,
        setJiraUrl: setJiraUrl,
        updateWorklog: updateWorklog,
        deleteWorklog: deleteWorklog
    }

})();