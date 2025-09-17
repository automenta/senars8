class BaseEntity {
    constructor() {
        this._toStringCache = null;
    }

    // Caching for toString
    toString() {
        if (!this._toStringCache) {
            this._toStringCache = this.formatString();
        }
        return this._toStringCache;
    }

    // To be implemented by subclasses
    formatString() {
        throw new Error('formatString must be implemented by subclass');
    }

    // Equality checking
    equals(other) {
        if (!other || this.constructor !== other.constructor) {
            return false;
        }
        return this.getId() === other.getId();
    }

    // To be implemented by subclasses
    getId() {
        throw new Error('getId must be implemented by subclass');
    }

    // Cloning
    clone() {
        const cloned = Object.create(Object.getPrototypeOf(this));
        Object.assign(cloned, this);
        cloned._toStringCache = null;
        return cloned;
    }

    // JSON serialization
    toJSON() {
        throw new Error('toJSON must be implemented by subclass');
    }
}

export default BaseEntity;
