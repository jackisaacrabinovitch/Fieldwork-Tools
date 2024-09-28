class Cell{
	constructor(column,text){
		this.column = column
		this.content = column.parse(text)
	}
	print(){
		return this.column.write(this.content)
	}
	removeReferences(){
		if (this.column.main === "R"){
			this.content.forEach((x)=>{
				x.remove()
			})
		}
		return this
	}
}
class Column{
	constructor(db,type_string,name){
		this.db = db
		this.name = name
		this.main = type_string[0]
		// If there are brackets
		let dels = type_string.match(/(?<!\[)\[.*\](?!\])/g)
		let refnum
		if (dels !== null){
			this.delimiters = dels[0].slice(1,-1).split("][")
			refnum = type_string.slice(0).match(/[0-9]+(?=\[)/g)
		} else {
			this.delimiters = []
			refnum = type_string.slice(0).match(/[0-9]+$/g)
		}
		if (refnum !== null){
			this.crossReference = new CrossReference(db,Number(refnum[0]))
		} else {
			this.crossReference = null
		}
		switch (this.main) {
			case "S":
				this.parse = function(x){return this.splitCollection(x)}
				this.write = function(x){return this.joinCollection(x)}
				break;
			case "N":
				this.parse = function(x){
					if (x === ""){return Collection.empty}
					return this.splitCollection(x).map((y)=>{return Number(y)})
				}
				this.write = function(x){return this.joinCollection(x)}
				break;
			case "R":
				this.parse = function(x){
					if (x === ""){return Collection.empty}
					return this.splitCollection(x).map((y)=>{
						return new Reference(this.crossReference.sheet,Number(y))
					})
				}
				this.write = function(x){
					return this.joinCollection(x.map((y)=>{return y.index}))
				}
				break;
			default:
				break;
		}
	}
	splitCollection(string){
		return Collection.split(string,this.delimiters)
	}
	joinCollection(collection){
		return collection.join(this.delimiters)
	}
	printType(){
		return `${this.main}${this.crossReference?.index ?? ""}${this.delimiters.map((x)=>{return `[${x}]`}).join("")}`
	}
	setIndex(index){
		this.index = index
	}
	remove(){
		this.db.cross_references = this.db.cross_references.filter(item => item !== this)
		this.crossReference = null
	}
}
class Entry{
	constructor(columns,text){
		this.cells = text.split("\t").map((text,column_no)=>{
			return new Cell(columns[column_no],text)
		})
	}
	console(){
		return this.cells.map((cell,id)=>{
			return cell.print()
		})
	}
	print(){
		return this.cells.map((cell,id)=>{
			return cell.print()
		}).join("\t")
	}
	static equals(x,y){
		return x.print() === y.print()
	}
	equals(y){
		return Entry.equals(this,y)
	}
	// Functions which are mapped from Sheets
	column(name_or_number){
		if (typeof name_or_number === 'number'){return this.cells[name_or_number]}
		return this.cells.find((cell)=>{return cell.column.name === name_or_number})
	}

}
class Sheet{
	constructor(){
		this.db = null
		this.name = ""
		this.columns = []
		this.entries = []
		this.references = []
	}
	get length(){
		return this.entries.length
	}
	equivalentValue(id1,id2){
		return this.entries[id1].equals(this.entries[id2])
	}
	// 
	getIndices(func){
		return this.entries.flatMap((x,id)=>{
			if (func(x)){
				return [id]
			}
			return []
		})
	}
	// Get index if assigned, otherwise return -1
	indexOfEntry(entry){
		return this.entries.findIndex((other_entry)=>{return entry.equals(other_entry)})
	}
	// Get index if assigned, otherwise create new index, return index
	affirm(entry){
		let index = this.indexOfEntry(entry)
		if (index === -1){
			index = this.entries.length
			this.entries.push(entry)
		}
		return index
	}
	// Get all references to a specific index
	referencesFromIndex(index){
		if (index < 0 || index >= this.entries.length){return []}
		return this.references.filter((ref)=>{
			return ref.index === index
		})
	}
	static fromText(db,text){
		let k = new Sheet()
		let lines = text.split("\n")
		k.name = lines[0].slice(0,-3)
		k.db = db
		let column_names = lines[1].split("\t")
		let type_strings = lines[2].split("\t")
		k.columns = type_strings.map((type_string,id)=>{
			return new Column(db,type_string,column_names[id])
		})
		k.entries = []
		k.references = []
		k.content_lines = lines.slice(3)
		return k
	}
	parseContentLines(){
		this.entries = this.content_lines.map((line)=>{
			return new Entry(this.columns,line)
		})
		delete this.content_lines
	}
	console(){
		return this.entries.map((entry)=>{
			return entry.console()
		})
	}
	print(){
		let name = `===${this.name}===`
		let column_names = this.columns.map((column)=>{return column.name}).join("\t")
		let column_types = this.columns.map((column)=>{return column.printType()}).join("\t")
		let content = this.entries.map((entry)=>{
			return entry.print()
		})
		return [name,column_names,column_types,...content].join("\n")
	}
	deleteIfNotReferenced(id){
		if (this.referencesFromIndex(id).length === 0){
			this.deleteEntries(id)
		}
		return this
	}
	deleteAllNonReferenced(){
		for (let i = this.entries.length - 1; i > -1; i--){
			this.deleteIfNotReferenced(i)
		}
		return this
	}
	mergeIfIdentical(id1,id2){
		if (this.equivalentValue(id1,id2)){
			this.mergeEntries(id1,id2)
		}
		return this
	}
	mergeAllIdentical(){
		let length = this.entries.length
		if (length < 2){return this}
		for (let i = 0; i < length - 1; i++){
			for (let j = length - 1; j > i; j--){
				this.mergeIfIdentical(i,j)
			}
		}
		return this
	}
	switchEntries(id1,id2){
		// If an index is not relevant, ignore
		if (id1 === id2){return this}
		if (id1 < 0 || id2 < 0 || id1 >= this.entry.length || id2 >= this.entry.length){return this}
		// Define entries and references
		let val1 = this.entry[id1]
		let val2 = this.entry[id2]
		let refs1 = this.referencesFromIndex(id1)
		let refs2 = this.referencesFromIndex(id2)
		//Set indices to one another
		this.entry[id1] = val2
		this.entry[id2] = val1
		//Reset all relevant indices
		refs1.forEach((ref)=>{ref.resetIndex(id2)})
		refs2.forEach((ref)=>{ref.resetIndex(id1)})
		//Return sheet
		return this
	}
	mergeEntries(id1,id2){ // id1 is kept, id2 is disregarded
		// If an index is not relevant, ignore
		if (id1 === id2){return this}
		if (id1 < 0 || id2 < 0 || id1 >= this.entries.length || id2 >= this.entries.length){return this}
		// Set all references to id2 to id1
		this.referencesFromIndex(id2).forEach((ref)=>{ref.resetIndex(id1)})
		return this.deleteIndex(id2)
	}
	deleteEntries(...args){
		// If an index is not relevant, ignore
		let ids = [...new Set(args.flat().filter((id)=>{
			return id > -1 && id < this.entries.length
		}))]
		// Go through reference list
		this.references = this.references.forEach((ref)=>{
			let refindex = ref.index
			// Delete references to members of ids, and set index to null for those references
			if (ids.includes(refindex)){
				ref.remove()
			} else {
				// Otherwise, find how many ids are less than refindex, and subtract that many
				ref.index -= ids.filter((id)=>{
					return id < refindex
				}).length 
			}
		})
		// Remove each of the relevant entries from the sheet
		this.entries = this.entries.filter((entry,id)=>{
			return !ids.includes(id)
		})
	}
	deleteColumns(...args){
		// If an index is not relevant, ignore
		let ids = [... new Set(args.flat().flatMap((name_or_number)=>{
			let index = name_or_number
			if (typeof name_or_number === 'string'){
				index = this.columns.findIndex((x)=>{return x.name === name_or_number})
			}
			if (index > -1 && index < this.columns.length){
				return [index]
			}
			return []
		}))]
		// Go through each entry and delete cells (first removing any references they have)
		this.entries.forEach((entry) => {
			entry.cells = entry.cells.flatMap((cell,id)=>{
				if (ids.includes(id)){
					cell.removeReferences()
					return []
				}
				return [cell]
			})
		});
		// Remove columns that are in the ids
		this.columns = this.columns.filter((column,id) => {
			if (!ids.includes(id)){
				return true
			}
			if (column.main === "R"){
				// If the column is referential, remove its cross-reference from the db
				column.remove()
			}
			return false
		});
	}
	addEntry(text,position){
		// Make target id reasonable
		let target_id = position < 0 ? 0 : position >= this.entries.length ? this.entries.length-1 : position
		// Go through reference list
		this.references = this.references.forEach((ref)=>{
			// If the reference id is more than the position, add 1
			if (ref.index > target_id){
				ref.index ++
			}
		})
		// Add the entry in the appropriate position
		this.entries.splice(target_id,0,new Entry(this.columns,text))
	}
	addColumn(column,cell_array,position=Infinity){
		let target_id = position < 0 ? 0 : position >= this.entries.length ? this.entries.length-1 : position
		this.columns.splice(target_id,0,column)
		this.entries.forEach((entry,id) => {
			entry.cells.splice(target_id,0,cell_array[id])
		});
	}


	//Sheet Manipulation Functions
	filter(func){
		let deletes = this.entries.flatMap((entry,id)=>{
			if (func(entry,id,this)){
				return []
			}
			return [id]
		})
		this.deleteEntries(...deletes)
		return this
	}
	subset(func){
		let deletes = this.columns.flatMap((column,id)=>{
			if (func(column,id,this)){
				return []
			}
			return [id]
		})
		this.deleteColumns(...deletes)
		return this
	}
	mutate(name,type,func,position=undefined){
		// Create New Column
		let new_col = new Column(this.db,type,name)
		// Make new set of cell content
		let col_data = this.entries.map((entry,id)=>{
			return new Cell(new_col,func(entry,id,this))
		})
		// Check if column name is taken
		let ind = this.columns.findIndex((col)=>{return col.name === name})
		// If column name is taken, delete column
		if (ind !== -1){
			this.deleteColumns(ind)
		}
		let i = position === undefined ? ind : position
		i = i === -1 ? Infinity : i
		// Add in column with content
		this.addColumn(new_col,col_data,position)
	}
	mutateList(names,types,func){
		// Create arr of columns
		let col_arr = names.map((x,id)=>{
			return new Column(this.db,types[id],x)
		})
		// make col data
		let col_data = this.entries.map((entry,id)=>{
			return func(entry,id,this).map((res,id)=>{
				return new Cell(col_arr[id],res)
			})
		})
		// add in column with content
		col_arr.forEach((col,id)=>{
			this.addColumn(col,col_data.map((x)=>{
				return x[id]}))
		})
	}
}
class Reference{
	constructor(sheet,index){
		this.sheet = sheet
		this.index = Number(index)
		this.sheet.references.push(this)
	}
	static fromValue(sheet,value){
		return new Reference(sheet,sheet.affirm(value))
	}
	get value(){
		if (this.index === "" || this.index === undefined || this.index == null){
			return undefined
		}
		if (this.sheet.length < this.index || this.index < 0){
			return undefined
		}
		return this.sheet.entries[this.index]
	}
	resetIndex(index){
		this.index = index
	}
	resetValue(value){
		this.index = this.sheet.affirm(value)
	}
	remove(){
		this.sheet.references = this.sheet.references.filter(item => item !== this)
		this.index = null
	}
}
class Database{
	constructor(file_content){
		this.cross_references = []
		this.sheets = ["",...file_content.split("\n").filter((line)=>{return line!==""})]
			.join("\n").split(/\n===(?=[^\t\n].*===)/g)
			.slice(1)
			.map((sheet_text)=>{
				return Sheet.fromText(this,sheet_text)
			})
		
		this.sheets.forEach((sheet)=>{
			sheet.parseContentLines()
		})
	}

	print(){
		return this.sheets.map((sheet)=>{
			return sheet.print()
		}).join("\n")
	}
	copy(){
		return new Database(this.print())
	}
}
class CrossReference{
	constructor(db,index){
		this.db = db
		this.index = index
		this.db.cross_references.push(this)
	}
	get sheet(){
		return this.db.sheets[this.index]
	}
	resetIndex(index){
		this.index = index
	}
}
class Collection{
	constructor(obj){
		this.contents = obj
		this.length = 1
		this.depth = 0
		this.shallowness = 0
		this.Dyck = "[]"
	}
	static get empty(){
		let k = new Collection()
		k.depth = -1
		k.shallowness = -1
		k.Dyck = ""
		k.length = 0
		return k
	}
	element(loc){
		let res = this
		for (let i = 0; i < loc.length ; i++){
			if (! res instanceof Collection){return undefined}
			if (loc[i] > res.length - 1){return undefined}
			if (loc[i] < -res.length){return undefined}

			if (loc[i] < 0){
				res = res.contents[res.length+loc[i]]
			} else {
				res = res.contents[loc[i]]
			}
		}
		return res.contents
	}
	isEmpty(){
		return this.Dyck === ""
	}
	getDefinitions(){
		this.length = this.contents.length
		this.depth = Math.max(...this.contents.map((x)=>{return x.depth})) + 1
		this.shallowness = Math.min(...this.contents.map((x)=>{return x.shallowness})) + 1
		this.Dyck = `[${this.contents.map((x)=>{return x.Dyck}).join("")}]`
	}
	static fromArray(arr,depth=Infinity){
		if (!Array.isArray(arr) || depth < 1){
			return new Collection(arr)
		}
		let k = new Collection()
		k.contents = arr.map((x)=>{
			return Collection.fromArray(x,depth-1)
		})
		k.getDefinitions()
		return k
	}
	static fromCollections(...args){
		if (args.length === 0){return Collection.empty}
		let k = new Collection()
		k.contents = args.filter((x)=>{
			return !x.isEmpty()
		})
		k.getDefinitions()
		return k
	}
	flat(){
		if (this.depth === -1){
			return []
		}
		if (this.depth === 0){
			return [this.contents]
		}
		return this.contents.flatMap((x)=>{
			return x.flat()
		})
	}
	map(func,loc=[],total_collection){
		if (total_collection === undefined){
			total_collection = this
		}
		if (this.depth === -1){
			return this
		}
		if (this.depth === 0){
			return new Collection(func(this.contents,loc,total_collection))
		}
		return Collection.fromCollections(...this.contents.map((x,id)=>{
			return x.map(func,[...loc,id],total_collection)
		}))
	}
	forEach(func,loc=[],total_collection){
		this.map(func,loc=[],total_collection)
		return 
	}
	unwrap(){
		if (this.depth === -1){
			return undefined
		}
		if (this.depth === 0){
			return this.contents
		}
		return this.contents.map((x)=>{
			return x.unwrap()
		})
	}
	join(arr){
		if (this.depth === -1){return ""}
		if (this.depth === 0){return this.contents}
		return this.contents.map((x)=>{
			return x.join(arr.slice(1))
		}).join(arr[0])
	}
	static split(string,arr){
		if (arr.length === 0){
			return new Collection(string)
		}
		return Collection.fromCollections(...string.split(arr[0]).map((x)=>{
			return Collection.split(x,arr.slice(1))
		}))
	}
	static equal(col1,col2,func = (x,y)=>{return x === y}){
		if (!(col1 instanceof Collection && col2 instanceof Collection)){
			return undefined
		}
		if (col1.Dyck !== col2.Dyck){
			return false
		}
		let col1f = col1.flat()
		let col2f = col2.flat()
		if (col1f.length !== col2f.length){
			return false
		}
		for (let i = 0; i < col1f.length; i++){
			if (!func(col1f[i],col2f[i])){
				return false
			}
		}
		return true
	}
	includes(obj){
		return this.unwrap().includes(obj)
	}
}