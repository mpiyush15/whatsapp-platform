export const makeId = (prefix = "node") => `${prefix}_${Math.random().toString(36).substr(2, 9)}`

export const buildHealthcareRegistrationGraph = () => {
  const startId = makeId("start")
  const lookupId = makeId("lookup")
  const condId = makeId("cond")
  const welcomeBackId = makeId("welcome_back")
  const askNameId = makeId("ask_name")
  const createPatientId = makeId("create_patient")
  const welcomeNewId = makeId("welcome_new")

  const nodes = [
    { id: startId, type: "start", position: { x: 80, y: 80 }, data: { label: "Keyword Trigger" } },
    { id: lookupId, type: "vertical_action", position: { x: 80, y: 220 }, data: { label: "Lookup Patient", vertical: "healthcare", action: "lookup_patient" } },
    { id: condId, type: "condition", position: { x: 80, y: 380 }, data: { label: "Patient Exists?", variable: "patient_exists", branches: [{ id: "b1", value: "yes" }, { id: "b2", value: "no" }] } },
    { id: welcomeBackId, type: "end", position: { x: -160, y: 540 }, data: { label: "Welcome Back", text: "Welcome back, {{patientName}}! How can we help?" } },
    { id: askNameId, type: "question", position: { x: 280, y: 540 }, data: { label: "Ask Name", text: "Welcome! To register, please share your full name.", saveAs: "patient_name" } },
    { id: createPatientId, type: "vertical_action", position: { x: 280, y: 700 }, data: { label: "Register Patient", vertical: "healthcare", action: "create_patient", actionConfig: { nameVar: "{{patient_name}}" } } },
    { id: welcomeNewId, type: "end", position: { x: 280, y: 860 }, data: { label: "Done", text: "Thanks {{patientName}}. You are now registered with our clinic." } },
  ];

  const edges = [
    { id: `e-${startId}-${lookupId}`, source: startId, target: lookupId, sourceHandle: "next" },
    { id: `e-${lookupId}-${condId}`, source: lookupId, target: condId, sourceHandle: "next" },
    { id: `e-${condId}-${welcomeBackId}`, source: condId, target: welcomeBackId, sourceHandle: "branch:b1" },
    { id: `e-${condId}-${askNameId}`, source: condId, target: askNameId, sourceHandle: "branch:b2" },
    { id: `e-${askNameId}-${createPatientId}`, source: askNameId, target: createPatientId, sourceHandle: "next" },
    { id: `e-${createPatientId}-${welcomeNewId}`, source: createPatientId, target: welcomeNewId, sourceHandle: "next" },
  ];

  return { nodes, edges }
}

export const buildHealthcareSlotCheckerGraph = () => {
  const startId = makeId("start")
  const doctorId = makeId("doctor")
  const checkSlotId = makeId("check_slot")
  const showSlotsId = makeId("show_slots")

  const nodes = [
    { id: startId, type: "start", position: { x: 80, y: 80 }, data: { label: "Keyword Trigger" } },
    { id: doctorId, type: "list", position: { x: 80, y: 220 }, data: { label: "Choose Doctor", text: "Please select a doctor to check their availability:", dynamicList: "healthcare_doctors", saveAs: "doctor_id" } },
    { id: checkSlotId, type: "vertical_action", position: { x: 80, y: 380 }, data: { label: "Check Slots", vertical: "healthcare", action: "check_slot", actionConfig: { doctorId: "{{doctor_id}}", durationMinutes: "30", saveAs: "available_slots" } } },
    { id: showSlotsId, type: "end", position: { x: 80, y: 540 }, data: { label: "Show Slots", text: "Here are the available slots for the next 7 days:\n{{available_slots}}\n\nPlease call us to confirm." } },
  ];

  const edges = [
    { id: `e-${startId}-${doctorId}`, source: startId, target: doctorId, sourceHandle: "next" },
    { id: `e-${doctorId}-${checkSlotId}`, source: doctorId, target: checkSlotId, sourceHandle: "next" },
    { id: `e-${checkSlotId}-${showSlotsId}`, source: checkSlotId, target: showSlotsId, sourceHandle: "next" },
  ];

  return { nodes, edges }
}

export const buildHealthcareBookingGraph = () => {
  const startId = makeId("start")
  const lookupId = makeId("lookup")
  const condId = makeId("cond")
  
  // Registration nodes for unregistered users
  const askNameId = makeId("ask_name")
  const createPatientId = makeId("create_patient")
  const welcomeNewId = makeId("welcome_new")
  
  // Welcome for registered users
  const welcomeBackId = makeId("welcome_back")
  
  // Shared booking flow
  const doctorId = makeId("doctor")
  const slotId = makeId("slot")
  const bookId = makeId("book")
  const endId = makeId("end")

  const nodes = [
    { id: startId, type: "start", position: { x: 80, y: 80 }, data: { label: "Keyword Trigger" } },
    { id: lookupId, type: "vertical_action", position: { x: 80, y: 220 }, data: { label: "Lookup Patient", vertical: "healthcare", action: "lookup_patient" } },
    { id: condId, type: "condition", position: { x: 80, y: 380 }, data: { label: "Patient Exists?", variable: "patient_exists", branches: [{ id: "b1", value: "yes" }, { id: "b2", value: "no" }] } },
    
    // No Branch (Not registered)
    { id: askNameId, type: "question", position: { x: -160, y: 540 }, data: { label: "Ask Name", text: "Welcome to our clinic! Before booking, please share your full name.", saveAs: "patient_name" } },
    { id: createPatientId, type: "vertical_action", position: { x: -160, y: 700 }, data: { label: "Register Patient", vertical: "healthcare", action: "create_patient", actionConfig: { nameVar: "{{patient_name}}" } } },
    { id: welcomeNewId, type: "message", position: { x: -160, y: 860 }, data: { label: "Welcome New", text: "Thanks {{patientName}}! Let's get you booked." } },
    
    // Yes Branch (Already registered)
    { id: welcomeBackId, type: "message", position: { x: 280, y: 540 }, data: { label: "Welcome Back", text: "Welcome back, {{patientName}}! Let's get you booked." } },
    
    // Convergence to Doctor Selection
    { id: doctorId, type: "list", position: { x: 80, y: 1020 }, data: { label: "Choose Doctor", text: "Please select a doctor to book with:", dynamicList: "healthcare_doctors", saveAs: "doctor_id" } },
    { id: slotId, type: "list", position: { x: 80, y: 1180 }, data: { label: "Choose Slot", text: "Pick an available time:", dynamicList: "healthcare_slots", saveAs: "slot_choice" } },
    { id: bookId, type: "vertical_action", position: { x: 80, y: 1340 }, data: { label: "Book Appointment", vertical: "healthcare", action: "book_appointment", actionConfig: { doctorId: "{{doctor_id}}", slotVar: "{{slot_choice}}", slotsVar: "_slot_picker_json", patientNameVar: "{{patientName}}" } } },
    { id: endId, type: "end", position: { x: 80, y: 1500 }, data: { label: "Confirmed", text: "Your appointment is confirmed! We will see you soon." } },
  ];

  const edges = [
    { id: `e-${startId}-${lookupId}`, source: startId, target: lookupId, sourceHandle: "next" },
    { id: `e-${lookupId}-${condId}`, source: lookupId, target: condId, sourceHandle: "next" },
    
    // Branch No
    { id: `e-${condId}-${askNameId}`, source: condId, target: askNameId, sourceHandle: "branch:b2" },
    { id: `e-${askNameId}-${createPatientId}`, source: askNameId, target: createPatientId, sourceHandle: "next" },
    { id: `e-${createPatientId}-${welcomeNewId}`, source: createPatientId, target: welcomeNewId, sourceHandle: "next" },
    { id: `e-${welcomeNewId}-${doctorId}`, source: welcomeNewId, target: doctorId, sourceHandle: "next" },
    
    // Branch Yes
    { id: `e-${condId}-${welcomeBackId}`, source: condId, target: welcomeBackId, sourceHandle: "branch:b1" },
    { id: `e-${welcomeBackId}-${doctorId}`, source: welcomeBackId, target: doctorId, sourceHandle: "next" },
    
    // Booking Flow
    { id: `e-${doctorId}-${slotId}`, source: doctorId, target: slotId, sourceHandle: "next" },
    { id: `e-${slotId}-${bookId}`, source: slotId, target: bookId, sourceHandle: "next" },
    { id: `e-${bookId}-${endId}`, source: bookId, target: endId, sourceHandle: "next" },
  ];

  return { nodes, edges }
}
