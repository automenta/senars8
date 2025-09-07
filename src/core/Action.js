class Action {
    constructor(name, parameters = [], resources = []) {
        this.name = name;
        this.parameters = parameters;
        this.resources = resources;
    }
}

module.exports = Action;
