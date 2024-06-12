let languages = {
    Mandarin: {
        clausekinds: {
            decl: ["bare decl","shuo decl"],
            pol: ["bare pol","shuo pol"],
            wh: ["bare wh","shuo wh"]
        },
        predicates:{
            SAY: "说 (shuo)",
            ASK: "问 (wen)",
            EXPLAIN: "解释 (jieshi)",
            DENY: "否认 (fouren)",
            COMMENT: "评论 (pinglun)",
            ANSWER: "回答 (huida)",
            QUESTION: "质疑 (zhiyi)"
        }
    },
    English: {
        clausekinds: {
            decl: ["that decl"],
            pol: ["whether pol","if pol","inverted pol"],
            wh: ["plain wh","inverted wh"]
        },
        predicates:{
            SAY: "say",
            ASK: "ask",
            EXPLAIN: "explain",
            DENY: "deny",
            COMMENT: "comment",
            ANSWER: "answer",
            QUESTION: "question"
        }
    },
    Hindi: {
        clausekinds: {
            "decl": ["finite ki declarative clause"],
            "pol": ["finite ki + ya nahin", "finite ki + initial kya", "finite ki + final kya"],
            "wh": ["finite ki wh"]
        },
        predicates: {
            SAY: "कहना (kahnaa)",
            ASK: "पूछना (puuchnaa)",
            EXPLAIN: "समझाना (samjhaanaa)",
            DENY: "इनकार करना (inkaar karnaa)",
            COMMENT: "टिप्पणी करना (tippanee karnaa)",
            ANSWER: "जवाब देना (javaab denaa)",
            QUESTION: "प्रश्न करना (prashn karnaa)"
        }
    },
    Catalan: {
        clausekinds: {
            "decl": ["finite que declarative","double que recomplementation"],
            "pol": ["finite si", "finite que + si"],
            "wh": ["finite wh", "finite que + wh"]
        },
        predicates: {
            SAY: "dir",
            ASK: "preguntar",
            EXPLAIN: "explicar",
            DENY: "negar",
            COMMENT: "comentar",
            ANSWER: "respondre",
            QUESTION: "qüestionar"
        }
    },
    Korean: {
        clausekinds: {
            "decl": ["ta-nun(kes)", "ta-ko", "ta-mye"],
            "pol": ["nya-nun(kes)", "nya-ko", "nya-mye", "nunci"],
            "wh": ["wh + nya-nun(kes)", "wh + nya-ko", "wh + nya-mye",]
        },
        predicates: {
            SAY: "말하다 (malhada)",
            ASK: "묻다 (mutda)",
            EXPLAIN: "설명하다 (seolmyeonghada)",
            DENY: "부정하다 (bujeonghada)",
            COMMENT: "언급하다 (eongeupada)",
            ANSWER: "대답하다 (daedaphada)",
            QUESTION: "이론을 제기하다 (ironeul jegihada)"
        }
    },
    Georgian: {
        clausekinds: {
            "decl": ["rom", "is + rom"],
            "pol": ["tu ara", "is + tu ara"],
            "wh": ["wh", "is + wh"]
        },
        predicates: {
            SAY: "ამბობს (ambobs)",
            ASK: "იკითხავს (ik'itxavs)",
            EXPLAIN: "ახსნა (axsna)",
            DENY: "უარყოფს (uarq'ops)",
            COMMENT: "კომენტარების გაკეთება (k'oment'arebis gak'eteba)",
            ANSWER: "უპასუხა (up'asukha)",
            QUESTION: "???"
        }
    }
}
let originalnames = ["John", "Mary", "Bill", "Sue", "Harold", "Fiona"]

async function performAll(language){
	let survey = await fetch("survey.json")
		.then(returnJSON)

    let codes = await fetch("codes.json")
		.then(returnJSON)

    let names = codes.names[language]
    console.log(names)

    

    let res = []
    let tasknumber = 0
    let notenumber = 0
    let setnumber = 0
    let stepnumber = 0
    let idmap = {
        num2id: {},
        id2num: {},
        minclass2ids:{},
    }

    let taskarr = codes.Task_Order
    let taskids = []
    
    taskarr.forEach((task) => {
        if (task.item === "task"){
            let p = []
            survey.find((x)=>{return x.Task_Name === task.id}).steps.forEach(step => {
                stepnumber ++
                idmap.id2num[step.id] = stepnumber
                idmap.num2id[stepnumber] = step.id
                if (step.minimal_class !== undefined){
                    if (idmap.minclass2ids[step.minimal_class] === undefined){
                        idmap.minclass2ids[step.minimal_class] = []
                    }
                    idmap.minclass2ids[step.minimal_class].push(step.id)
                    p.push(step.minimal_class)
                }
            });
            taskids.push({
                task: task.id,
                minimal_sets: p
            })
        }
    });


    let subtaskgroups = []
    taskarr.forEach(task => {
        if (task.item === "session"){
            res.push(`<h1>${task.title}</h1><p>${task.content}</p>`)
        } else if (task.item === "note"){
            notenumber++
            res.push(`<h3>Note ${notenumber}: ${task.title}</h3><p>${task.content}</p>`)
        } else if (task.item === "set"){
            setnumber++
            res.push(`<h2>Set ${setnumber}: ${task.title}</h2><p>${task.content}</p>`)
        } else if (task.item === "task"){
            tasknumber ++
            let thetask = survey.find((x)=>{return x.Task_Name === task.id})
            res.push(`<h3>Task ${tasknumber}: ${thetask.Task_Name}</h3><div id="task-content-${task.id}">`)
            thetask.steps.forEach((step) => {
                res.push(formatStep2(step,languages[language],idmap,codes.Context_Types[step.context_type]))
                subtaskgroups.push(step)
            });
            res.push(`</div>`)
        }
    });

    console.log(subtaskgroups.map((x)=>{
        return [x.id , ... ifUndefined(x.minimal_pairs,[])]}
    ).map((x)=>{
        return x.sort()
    }).filter((x)=>{
        return x.length != 1
    }).filter((x,id,arr)=>{
        return arr.findIndex((z)=>{return arraysEqual(z,x)}) === id
    }) )
    document.getElementById("main").innerHTML = res.join("")
    makeTOC() 

    Object.keys(codes.naming_system).forEach(group => {
        codes.naming_system[group].tasks.forEach(task => {
            let html = document.getElementById(`task-content-${task}`).innerHTML
            let indices = codes.naming_system[group].naming.split(" ").map((x)=>{return Number(x)})
            for (let i = 0; i< 6; i++){
                html = html.replaceAll(originalnames[i],names.Given[indices[i]])
                console.log(originalnames[i])
                console.log(indices[i])
            }
            html = html.replaceAll("Smith",names.Smith)
            document.getElementById(`task-content-${task}`).innerHTML = html
        });
    });

    // rewriteVerbChecks(survey,clausekinds)

    // document.querySelectorAll(".VERBINPUT").forEach(element => {
    //     element.addEventListener("change",()=>{rewriteVerbChecks(survey,clausekinds)})
    // });
}

function formatDescription(desc){
    let k = {
        "decl/prop":"<b>declarative clause</b> refers to the <b>propositional content</b>",
        "int/prop":"<b>interrogative clause</b> refers to the <b>propositional content</b> (via answerhood)",
        "int/ques":"<b>interrogative clause</b> which refers to the <b>question content</b>",
        "":""
    }
    return `<p><b>Description:</b> This subtasks elicits a <b>report of ${desc.report_of}</b> where the embedded ${k[desc.form_content_type]} <b>of ${desc.content_represent}.</b> ${desc.containing}</p><p><b>Method:</b> ${desc.context}</p><p><b>Predicates:</b></p><ul>${desc.predicates.map((x)=>{
        return `<li>${x.predicate}: ${x.justification}</li>`
    }).join("")}</ul>`
}
function formatStep2(step,langinfo,idmap,codeinfo){
    let minimalpairs = ifUndefined(idmap.minclass2ids[step.minimal_class],[]).filter((x)=>{return x !== step.id})
    let contextform = `<div class="contextbox"><p><b>Context:</b></p><p>${step.context}</p></div>`
    let templateform = `<div class="contextbox"><p><b>Template:</b></p><p>${step.template}</p></div>`
    let checklist = `<div class="contextbox">
    <p><b>Checklist:</b></p>
    <p>${makeCheckTable(step,langinfo,codeinfo)}</p>
    ${minimalpairs.map((x)=>{
        return `<p>Forms minimal pair with <b>Subtask ${idmap.id2num[x]}</b> (id: ${x})</p>`
    }).join("")}
    </div>`

    return `<div class="stepbox"><h4>Subtask ${idmap.id2num[step.id]} (id: ${step.id})</h4>${formatDescription(codeinfo)}${contextform}<br>${templateform}<br>${checklist}</div>`
}

function makeCheckTable(step,langinfo,codeinfo){
    let columns = ["DEFAULT", ...codeinfo.predicates.map((x)=>{return x.predicate})]
    let rows = ["default", ...langinfo.clausekinds[step.clause_type], `quotation ${step.clause_type}`]
    let table = [`<table>`,`<tr><td class="comptype"></td>`]

    table.push(columns.map((x)=>{
        return `<td>${x}</td>`
    }).join(''))
    table.push(`</tr><tr><td class="comptype"></td>`)
    table.push(columns.map((x)=>{
        return `<td>${ifUndefined(langinfo.predicates[x])}</td>`
    }).join(''))
    table.push(`</tr>`)
    rows.forEach(comptype => {
        table.push(`<tr><td class="comptype">${comptype}</td>${`<td><input type="checkbox"></input></td>`.repeat(columns.length)}</tr>`)
    });
    table.push(`</table>`)
    return `${table.join("")}`
}


function ifUndefined(x,def=""){
	if (x !== undefined) {
		return x
	}
	return def;
}



//Return JSON
function returnJSON(res){
	if (!res.ok) {
		throw new Error
			(`HTTP error! Status: ${res.status}`);
	}
	return res.json();
}
function formatStep(step){
    return [
        `<p><input type="checkbox" id="${step.id}CONTEXT"><label for="${step.id}CONTEXT"><b>Present the following context:</b></label><div class="contextbox">${step.context}</div></p>`,
        `<p><input type="checkbox" id="${step.id}TEMPLATE"><label for="${step.id}TEMPLATE"><b>Have consultant translate the template into their language, filling in the blank with whatever verb they think accurately represents the context:</b></label><div class="contextbox">${step.template}</div></p>`,
        `<p>Predicate is: <input class="VERBINPUT" type="text" id="${step.id}VERBINPUT" name="${step.id}VERBINPUT"></input></p>`,
        `<div class="VERBCHECK" id="VERBCHECK-${step.id}"></div>`
    ].join("")
}
function rewriteVerbChecks(survey,langinfo){
    document.querySelectorAll(".VERBCHECK").forEach(element => {
        let currentid = element.id.split("-")[1]
        let currentidverb = document.getElementById(`${currentid}VERBINPUT`).value
        let copyids = []
        let currentstep = undefined
        for (let i = 0; i < survey.length; i++){
            currentstep = survey[i].steps.find((x)=>{return x.id === currentid})
            if (currentstep !== undefined){
                copyids = currentstep.same_verb
                i=Infinity
            }
        }
        let res = []
        let k = copyids.map((copyid) => {
            return document.getElementById(`${copyid}VERBINPUT`).value
        }).unique().filter((x)=>{
            return x !== currentidverb
        })
        k.unshift(currentidverb)
        k.forEach(verb => {
            res.push(formatChecklist(currentstep,langinfo,verb))
        });

        element.innerHTML = res.join("")
    });
}

function formatChecklist(step,langinfo,verb){
    return`<p><b>Get consultant judgments on variants of the consultant's translation the above template, using the matrix verb "${verb}", with the following kinds of complements:</b><br>${langinfo[step.clause_type].map((val,id)=>{return `<input type="checkbox" id="${step.id}_CLAUSETYPES_${id}"><label for="${step.id}_CLAUSETYPES_${id}">${val}</label>`}).join("<br>")}</p>` 
}

//Unique Function
Array.prototype.unique = function(){
	return [...new Set(this)];
}

//Arrays Equal
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }


function makeTOC(){
    var toc = "";
    var level = 0;

    document.getElementById("main").innerHTML =
        document.getElementById("main").innerHTML.replace(
            /<h([\d])>([^<]+)<\/h([\d])>/gi,
            function (str, openLevel, titleText, closeLevel) {
                if (openLevel != closeLevel) {
                    return str;
                }

                if (openLevel > level) {
                    toc += (new Array(openLevel - level + 1)).join("<ul>");
                } else if (openLevel < level) {
                    toc += (new Array(level - openLevel + 1)).join("</ul>");
                }

                level = parseInt(openLevel);

                var anchor = titleText.replace(/ /g, "_");
                toc += "<li><a href=\"#" + anchor + "\">" + titleText
                    + "</a></li>";

                return "<h" + openLevel + "><a name=\"" + anchor + "\">"
                    + titleText + "</a></h" + closeLevel + ">";
            }
        );

    if (level) {
        toc += (new Array(level + 1)).join("</ul>");
    }

    document.getElementById("toc").innerHTML = toc;
};


performAll("Georgian");
