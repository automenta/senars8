class BaseEntity {
    constructor() {
        this._toStringCache = null;
    }

    toString() {
        if (!this._toStringCache) {
            this._toStringCache = this.formatString();
        }
        return this._toStringCache;
    }

    formatString() {
        throw new Error('formatString must be implemented by subclass');
    }

    equals(other) {
        if (!other || this.constructor !== other.constructor) return false;
        return this.getId() === other.getId();
    }

    getId() {
        throw new Error('getId must be implemented by subclass');
    }

    clone() {
        const cloned = Object.create(Object.getPrototypeOf(this));
        Object.assign(cloned, this);
        cloned._toStringCache = null;
        return cloned;
    }

    toJSON() {
        throw new Error('toJSON must be implemented by subclass');
    }
}

export default BaseEntity;
