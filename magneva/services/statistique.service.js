const HttpError = require("../httperror");
const db = require("../models");
const Appointment = db.appointment;
const ExpenseView = db.expenseView;
const PurchaseView = db.purchaseView;
const StatAppointment = db.statAppointment;
const Payment = db.payment;
const ChiffreAffaire = db.chiffreAffaire;
const { getAppointmentEmployee } = require("./appointment.service");
const { getValidEmployees } = require("./employee.service");

const generateDateArray = (dateDebut, dateFin) => {
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    const dateArray = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
};


const nbAppointmentInOneDay = async (date) => {
    try{
        const appointments = await Appointment.find({date: date}).exec();
        return appointments.length;
    }
    catch (error) {
        throw error;
    }
}

const statAppointmentInOneDay = async (req, res) => {
    let data = req.body;
    try{
        const stats = [];
        const dates = generateDateArray(data.startDate, data.endDate);
        for (const date of dates) {
            let nb = await nbAppointmentInOneDay(date);
            let stat = {
                name: date.toISOString().split('T')[0],
                y: nb
            }
            stats.push(stat);
        }
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const statAppointment = async (req, res) => {
    let data = req.body;
    try{
        const lists = await StatAppointment.find({year: data.year}).exec();
        const stats = allMois().map(month => {
            const stat = lists.find(list => list.month === month.month);
            return {
                name: month.monthName,
                y: stat ? stat.nb : 0
            }
        });
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const chiffreAffaireDayInOneDay = async (date) => {
    try{
        let ca = 0;
        const payments = await Payment.find({date: date}).exec();
        payments.forEach( payment  => {
            ca += payment.amount;
        });
        return ca;
    }
    catch (error) {
        throw error;
    }
}

const chiffreAffaireDay = async (req, res) => {
    let data = req.body;
    try{
        const stats = [];
        const dates = generateDateArray(data.startDate, data.endDate);
        for (const date of dates) {
            let ca = await chiffreAffaireDayInOneDay(date);
            let stat = {
                name: date.toISOString().split('T')[0],
                y: ca
            }
            stats.push(stat);
        }
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const allMois = () => {
    return [
        {"month": 1, "monthName": "Janvier"},
        {"month": 2, "monthName": "Février"},
        {"month": 3, "monthName": "Mars"},
        {"month": 4, "monthName": "Avril"},
        {"month": 5, "monthName": "Mai"},
        {"month": 6, "monthName": "Juin"},
        {"month": 7, "monthName": "Juiller"},
        {"month": 8, "monthName": "Août"},
        {"month": 9, "monthName": "Septembre"},
        {"month": 10, "monthName": "Octobre"},
        {"month": 11, "monthName": "Novembre"},
        {"month": 12, "monthName": "Décembre"}
    ]
}

const chiffreAffaire = async (year) => {
    try {
        const chiffres = await ChiffreAffaire.find({year: year}).exec();
        const stats = allMois().map(month => {
            const monthCa = chiffres.find(chiffre => chiffre.month === month.month);
            return {
                name: month.monthName,
                y: monthCa ? monthCa.ca : 0
            }
        });
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const allDepenses = async (year) => {
    try {
        const expenses = await ExpenseView.find({year: year}).exec();
        const purchases = await PurchaseView.find({year: year}).exec();
        const stats = allMois().map(month => {
            const monthExpense = expenses.find(expense => expense.month === month.month);
            const monthPurchase = purchases.find(purchase => purchase.month === month.month);
            let amountExpense = monthExpense ? monthExpense.amount : 0;
            let amountPurchase = monthPurchase ? monthPurchase.amount : 0;
            let amount = amountExpense + amountPurchase;
            return {
                name: month.monthName,
                y: amount
            }
        });
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const profit = async (req, res) => {
    try{
        const depenses = await allDepenses(req.body.year);
        const chiffres = await chiffreAffaire(req.body.year);
        const stats = [];
        for (let i = 0; i < depenses.length; i++) {
            const benefice = chiffres[i].y - depenses[i].y;
            let stat = {
                name: chiffres[i].name,
                y: benefice
            };
            stats.push(stat);
        }
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const statsInit = async(req, res) => {
    try{
        const stats = {
            nbReservationJour: await statAppointmentInOneDay(req, res),
            nbReservationMois: await statAppointment(req, res),
            caJour: await chiffreAffaireDay(req, res),
            caMois: await chiffreAffaire(req.body.year),
            profit: await profit(req, res),
            emp: await statEmp(req, res)
        }
        return stats;
    }
    catch (error) {
        throw error;
    }
}

const getTempsOneEmp = async (employee, startDate, endDate) => {
    try{
        let hourly = 0;
        const temps = await getAppointmentEmployee(employee._id.toString(), startDate, endDate, 1);
        temps.forEach(t=> {
            let h = t.hourEnd - t.hourBegin;
            hourly += h;
        });
        return hourly;
    }
    catch (error) {
        throw error;
    }
}

const formatHour = (hour)  => {
    let numberString = hour.toString();
    if (numberString.length < 4 && numberString.length !== 1) {
        numberString = "0" + numberString;
    };
    if( numberString.length === 1 ){
      numberString = "000" + numberString;
    }
    const hourFormatted = numberString.slice(0, 2);
    const minuteFormatted = numberString.slice(2, 4);
    return `${hourFormatted}:${minuteFormatted}`;
}

const statEmp = async(req, res) => {
    try{
        const stats = [];
        const employees = await getValidEmployees();
        for (const employee of employees) {
            const hour = await getTempsOneEmp(employee, req.body.startDate, req.body.endDate);
            const stat = {
                employee: employee,
                hour: formatHour(hour)
            };
            stats.push(stat);
        }
        return stats;
    }
    catch (error) {
        throw error;
    }
}

module.exports = {
    statAppointmentInOneDay,
    statAppointment,
    chiffreAffaireDay,
    chiffreAffaire,
    profit,
    allDepenses,
    statsInit,
    statEmp
}
