import * as userService from './users.js';
import * as requestService from './request.js'
import * as pdfService from './pdf.js'
import * as analyzeService from './analyzer.js'
import * as reportService from './report.js'
import * as wardService from './ward.js'
import * as analysisService from './analysis.js'

export const userServices = userService;
export const requestServices = requestService
export const pdfServices = pdfService
export const analyzeServices = analyzeService
export const reportServices = reportService
export const wardServices = wardService
export const analysisServices = analysisService

export default {
    userServices: userService,
    requestServices: requestService,
    pdfServices: pdfService,
    analyzeServices: analyzeService,
    reportServices: reportService,
    wardServices: wardService,
    analysisServices: analysisService
}