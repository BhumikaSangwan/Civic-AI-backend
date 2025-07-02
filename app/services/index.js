import * as userService from './users.js';
import * as requestService from './request.js'
import * as pdfService from './pdf.js'
import * as analyzeService from './analyzer.js'

export const userServices = userService;
export const requestServices = requestService
export const pdfServices = pdfService
export const analyzeServices = analyzeService

export default {
    userServices: userService,
    requestServices: requestService,
    pdfServices: pdfService,
    analyzeServices: analyzeService
}