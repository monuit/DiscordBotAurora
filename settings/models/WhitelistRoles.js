const mongoose = require("mongoose");

const WhitelistRolesSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    roleId: {
        type: String,
        required: true
    },
    roleName: {
        type: String,
        default: 'Unknown'
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Compound index for efficient queries
WhitelistRolesSchema.index({ guildId: 1, roleId: 1 }, { unique: true });
WhitelistRolesSchema.index({ guildId: 1, isActive: 1 });

module.exports = mongoose.model("WhitelistRoles", WhitelistRolesSchema);
