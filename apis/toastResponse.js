const CONSTANTS = require("../common/commonConstants.js")
const sendErrorResponse = (res, status, msg, color, icon, auth) => {
    if (status === 'Success') {
        color = CONSTANTS.TOAST_CONSTANTS[0].success.color
        icon = CONSTANTS.TOAST_CONSTANTS[0].success.icon
        auth = CONSTANTS.TOAST_CONSTANTS[0].success.auth
    }
    else if (status === "Warning") {
        color = CONSTANTS.TOAST_CONSTANTS[0].warning.color
        icon = CONSTANTS.TOAST_CONSTANTS[0].warning.icon
        auth = CONSTANTS.TOAST_CONSTANTS[0].warning.auth
    }
    else {
        color = CONSTANTS.TOAST_CONSTANTS[0].error.color
        icon = CONSTANTS.TOAST_CONSTANTS[0].error.icon
        auth = CONSTANTS.TOAST_CONSTANTS[0].error.auth
    }
    res.json({
        "toastHeader": status,
        "toastMsg": msg,
        "toastColor": color,
        "toastIcon": icon,
        "auth": auth
    })
    res.end()
}
module.exports = sendErrorResponse