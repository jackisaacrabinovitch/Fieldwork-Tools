async function getTextThen(file,func) {
	let x = await fetch(file);
	let y = await x.text();
	func(y)
}
function interleave(arr,leaf_func,inter_func){
	let res = []
	for (let i = 0; i < arr.length*2-1;i++){
		if (i % 2 === 0){
			res.push(leaf_func(arr[i/2]))
		} else {
			res.push(inter_func(arr[(i-1)/2],arr[(i+1)/2])) 
		}
	}
	return res
}
function cleanjudgment(judgment){
	if (judgment.includes("OK")){
		return ""
	}
	if (judgment.includes("*")||judgment.includes("#")){
		return "#"
	}
	return judgment.replace(/[\/\[\]\(\)\<\>]*/g,"")
}

function extractHTML(entry){
	let words = entry.column("Indices").content.map((word_id)=>{
		return word_id.value
	})
	let word_text = words.map((entry)=>{
		return entry.column("text").print()
	})
	let morphemes = words.map((entry)=>{
		return entry.column("morphemes").content.map((morph_id)=>{
			return morph_id.value
		})
	})
	let morph_text = morphemes.map((word_morphemes)=>{
		let k = interleave(word_morphemes.unwrap(),(morph)=>{
			return morph.column("text").print()
		},(morph1,morph2)=>{
			if ([morph1.column("clitic").print(),morph2.column("clitic").print()].includes("c")){
				return "="
			}
			return "-"
		}).join("")
		return k
	})
	let scribs_text = morphemes.map((word_morphemes)=>{
		let k = interleave(word_morphemes.unwrap(),(morph)=>{
			let scribs = morph.column("scribs").content.map((x)=>{
				return x.value
			})
			return interleave(scribs.unwrap(),(scrib)=>{
				if (scrib.column("format").print() === "a"){
					return `<span class="abbr">${scrib.column("text").print()}</span>`
				}
				return scrib.column("text").print()
			},(scrib1,scrib2)=>{
				if ((scrib1.column("format").print() === "a" && 
				scrib2.column("format").print() === "a") && 
				(scrib1.column("text").print().match(/^[0-9]+$/g) !== null ||
				scrib2.column("text").print().match(/^[0-9]+$/g) !== null)){
					return ""
				} 
				return "."
			}).join("")
		},(morph1,morph2)=>{
			if ([morph1.column("clitic").print(),morph2.column("clitic").print()].includes("c")){
				return "="
			}
			return "-"
		}).join("")
		return k
	})
	let example_table = word_text.map((_,loc)=>{
		return `<div class="gloss-column">` + [word_text,morph_text,scribs_text].map((x)=>{
			return `<div class="gloss-cell">${x.element(loc)}</div>`
		}).join("") + `</div>`
	}).join([""])
	let translation = entry.column("Translation").print()
	let judgment = cleanjudgment(entry.column("Judgment").print())
	let id = entry.column("id").print()



	let example_content = `
	<div class="sentence">
		<div class="judgment">${judgment}</div>
		<div class="gloss-with-translation">
			<div class="gloss-table">${example_table}</div>
			<div class="translation">${judgment === "#"?"Intended: ":""}"${translation}" (${id})</div>
		</div>
	</div>
	`
	return {
		value: example_content,
		key: id
	}
}
function makeIntoObject(arr){
	let k = {}
	arr.forEach(obj => {
		k[obj.key] = obj.value
	});
	return k
}



function getAllExamples(obj){
	let example_elements = document.getElementsByClassName("example")
	for (let i = 0; i < example_elements.length; i++){
		let example = example_elements[i]
		let id = example.dataset.key
		obj[id] = `${i+1}`
		let content = example.innerHTML
		example.innerHTML = `
		<div class="example-label" id="EX:${id}">(${obj[id]})</div>
		<div class="subcontainer">
		${content}
		</div>
		`
		let subexamples = example.getElementsByClassName("subexample")
		for (let j = 0; j < subexamples.length; j++){
			let subexample = subexamples[j]
			let subid = subexample.dataset.key
			let ix = ["a","b","c","d","e","f","g","h","i","j","k"][j]
			obj[subid] = `${i+1}${ix}`
			let subcontent = subexample.innerHTML
			subexample.innerHTML = `
			<div class="example-label" id="EX:${subid}">${ix}.</div>
			<div class="subcontainer">
			${subcontent}
			</div>
			`
		}
	}
}
function getAllSentences(sents){
	let sentence_elements = document.getElementsByClassName("sentence_ref")
	for (let i = 0; i < sentence_elements.length; i++){
		let sent = sentence_elements[i]
		sent.innerHTML = Object.keys(sents).includes(sent.dataset.sent) ? sents[sentence_elements[i].dataset.sent] : `No Sentence with name ${sent.dataset.sent}`
	}
}

function getAllReferences(ref_dict){
	let reference_elements = document.getElementsByClassName("references")
	for (let j = 0; j < reference_elements.length; j++){
		let references = reference_elements[j].dataset.refs.split(",")
		reference_elements[j].innerHTML = `(${references.map((reference)=>{
			if (Object.keys(ref_dict).includes(reference)){
				return `<a href="#EX:${reference}">${ref_dict[reference]}</a>`
			} 
			return "???"
		}).join(", ")})`
	}
}

function getAllTables(){
	let table_elements = document.getElementsByClassName("table")
	for (let i = 0; i < table_elements.length; i++){
		let table = table_elements[i]
		let table_contents = table.innerHTML.replace(/[\t\n]/g,"").split("!!").map((x)=>{
			return x.split("!")
		})
		table.innerHTML = `<table>` + table_contents.map((row)=>{
			return `<tr>` + row.map((cell)=>{
				return `<td>${cell}</td>`
			}).join("") + `</tr>`
		}).join("") + `</table>`
	}
}

function getAllHiders(){
	let hider_elements = document.getElementsByClassName("hider")
	for (let i = 0; i < hider_elements.length; i++){
		hider = hider_elements[i]
		contents = hider.innerHTML
		hider.innerHTML = `
		<div onclick="openx(${i})">
			<div class="grow-icon" id="grow-icon-${i}">➕</div>
			${hider.dataset.desc}
		</div>
		<div id="opendialog-${i}" style="display:none;">
			${contents}
		</div>
		`
	}
}
function openx(i) {
	let x = document.getElementById(`opendialog-${i}`);
	if (x.style.display === "none") {
		x.style.display = "block";
		document.getElementById(`grow-icon-${i}`).innerHTML = "➖";
	} else {
		document.getElementById(`grow-icon-${i}`).innerHTML = "➕";
		x.style.display = "none";
	}
  }




window.onload = doAllStuff

function doAllStuff(){

	getTextThen("mydata.txt",(db_text)=>{
	let db = new Database(db_text)

	console.log(db)

	let sents = makeIntoObject(db.sheets[4].entries.map(extractHTML))
	let ref_dict = {}
	getAllExamples(ref_dict)
	getAllSentences(sents)
	getAllReferences(ref_dict)
	getAllTables()
	getAllHiders()

	// for (let i = 0; i < examples_elements.length; i++){
	// 	let element = examples_elements[i]
	// 	let example_seeds = Collection.split(element.textContent.replace(/[\n\t]+/g,""),[";",","])
	// 		.unwrap()
	// 	if (example_seeds.length === 0){

	// 	} else if (example_seeds.length === 1){
	// 		ref_dict[example_seeds[0][0]] = i+1
	// 		element.innerHTML = `
	// 			<div class="example-label" id="EX:${example_seeds[0][0]}">(${i+1})</div>
	// 			<div>
	// 			${Object.keys(sents).includes(example_seeds[0][1]) ? sents[example_seeds[0][1]] : "Example Not Found"}
	// 			</div>
	// 		`
	// 	} else {
	// 		element.innerHTML = `
	// 			<div class="example-label">(${i+1})</div>
	// 			<div class="subexamples">
	// 				${example_seeds.map((seed,id)=>{
	// 					let subexample_label = ["a","b","c","d","e","f","g","h","i","j","k","l","m","m","o","p","q","r","s","t","u","v","w","x","y","z"][id]
	// 					ref_dict[seed[0]] = `${i+1}${subexample_label}`
	// 					return `
	// 					<div class="subexample">
	// 						<div class="example-label" id="EX:${seed[0]}">${subexample_label}.</div>
	// 						${Object.keys(sents).includes(seed[1]) ? sents[seed[1]] : "Example Not Found"}
	// 					</div>
	// 					`
	// 				}).join("")}
	// 			</div>
	// 		`
	// 	}
	// 	for (let j = 0; j < reference_elements.length; j++){
	// 		let references = reference_elements[j].dataset.refs.split(",")
	// 		reference_elements[j].innerHTML = `(${references.map((reference)=>{
	// 				if (Object.keys(ref_dict).includes(reference)){
	// 					return `<a href="#EX:${reference}">${ref_dict[reference]}</a>`
	// 				} 
	// 				return "???"
	// 			}).join(", ")})`
	// 	}		
	// }
	// console.log(db.sheets[2].getIndices((x)=>{
	// 	return x.column("text").print() === "dir"
	// }))


	// let examples_elements = document.getElementsByClassName("example")
	// for (let i = 0; i < examples_elements.length; i++){
	// 	let example_id = examples_elements[i].textContent
	// 	if (Object.keys(examples_content).includes(example_id)){
	// 		examples_elements[i].outerHTML = examples_content[example_id]
	// 	} else {
	// 		examples_elements[i].innerHTML = `Example ${example_id} does not exist`
	// 	}
	// }
	// let references_elements = document.getElementsByClassName("references")
	// for (let i = 0; i < references_elements.length; i++){
	// 	let example_ids = references_elements[i].textContent.split(",")
	// 	let res = example_ids.map((example_id)=>{
	// 		if (Object.keys(examples_content).includes(example_id)){
	// 			return `<a class="reference" href="#SENT:${example_id}">${example_id}</a>`
	// 		} else {
	// 			return `<span class="reference">???</span>`
	// 		}
	// 	})
	// 	references_elements[i].innerHTML = `(${res.join(", ")})`
	// }
})}