const db = require("../models");
const Appointment = db.appointment;
const AppointmentDetails = db.appointmentDetails;
const OpeningHour = db.openingHour;
const moment = require('moment');
const momentTimezone = require('moment-timezone');
const HttpError = require('../httperror');

const checkHour = async (date, hour) => {
    let openingHour = await OpeningHour.findOne({ day: date.getDay() }).exec();
    if(openingHour.isClosed || hour < openingHour.hourOpen || hour > openingHour.hourClose){
        throw new HttpError('Désolé, mais nous ne sommes pas encore ouverts à cette heure.', 400);
    }

    let currentTime = momentTimezone.tz('Indian/Antananarivo');
    if(hour < currentTime.format("HHmm") && currentTime.format("YYYY-MM-DD") == convertToTimezoneDate(date)){
        throw new HttpError('Veuillez choisir une heure exacte.', 400);
    }
}

const checkDate = (date) => {

    if(convertToTimezoneDate(date) < getCurrentDate()){
        throw new HttpError("Veuillez choisir une date valide", 400);
    }
}

const createAppointment = async (req, res) => {
    let data = req.body;
    data.date = new Date(data.date);
    data.hour = moment(data.hour, "HH:mm").format("HHmm");

    try{
        checkDate(data.date);
        await checkHour(data.date, data.hour);
    
        //create the appointment
        let appointment = new Appointment ({
            date : data.date,
            hour : data.hour,
            user: data.userId
        })
        await appointment.save();
       return appointment;   

    }catch(err){
        throw err;
    }
}

const getAppointments = async (req, res) => {
    return await Appointment.find({  user : req.query.userId });
}

const getCurrentDate = () => {
    return momentTimezone.tz('Indian/Antananarivo').format("YYYY-MM-DD");
}

const convertToTimezoneDate = (date) => {
    return  momentTimezone.tz(date, 'Indian/Antananarivo').format("YYYY-MM-DD");
}

const getAppointmentsByDate = async(date) => {
    try{
        let filter = {};
        if(date){
            filter.date = date.toISOString().split('T')[0];
        }
        const appointments = await Appointment.find(filter).exec();
        return appointments;

    }catch(error){
        throw error;
    }
}

const getAppointmentDetailByEmployee = async(date, employeeID, isFinished) => {
    try{
        const appointments = await getAppointmentsByDate(date);
        const appointmentDetailID = appointments.flatMap(appointment => appointment.appointmentDetails.map(detail => detail._id));
        let filter = {
            _id: { $in: appointmentDetailID },
            employee: employeeID
        };
        if( isFinished ){
            filter.isFinished = 1;
        }
        const appointmentDetails = await AppointmentDetails.find(filter).populate('service').exec();
        return appointmentDetails;
    }
    catch(error){
        throw error;
    }
}

module.exports = {
    createAppointment,
    getAppointments,
    getAppointmentsByDate,
    getAppointmentDetailByEmployee
}