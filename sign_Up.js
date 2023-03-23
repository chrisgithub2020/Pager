const electron = require("electron")
const ipc = electron.ipcRenderer
const fs = require("fs")

var signUP_button = document.getElementById("sign-up-button")
var fields = document.querySelectorAll("#inputEmail, #inputName, #inputPassword")
var pick_profile_picture = document.getElementById("sign-up-profile-picture-button")
var profile_picture_div = document.getElementById("choose-pic")
var verification_code_field = document.getElementById("verification_code_field")
var form_data = {};
var verified_email = ""
var fromData_toSave = {}

function submit_form_data() {
    const email_pattern = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    const username_pattern = /^[a-zA-Z\-]+$/;

    let username_verification = false
    let email_verification = false
    let password_verification = false
    fields.forEach((value, key, parent) => {
        let name_attribute = value.getAttribute("name")

        // VERIFYING THAT THIS IS A CORRECT USERNAME
        if (name_attribute === "username") {
            const username = value.value;
            let success = username_pattern.test(username)
            if (success === true) {
                form_data["name"] = username
                username_verification = true

            } else {
                // Showing alert that username is not real 
                ipc.send("show_message_to_user", 50)
            }
        }

        // VERIFYING THAT THIS IS A CORRECT EMAIL ADDRESS
        if (name_attribute === "email") {
            // GETTING VALUE OF CURRENT FIELD
            const email = value.value
            // CHECKING IF USER EMAII MATCHES PATTERN
            let success = email_pattern.test(email)
            if (success === true) {
                form_data["email"] = email
                email_verification = true
            } else {
                // Showing alert that email is not proper 
                ipc.send("show_message_to_user", 101)
            }
        }

        // VERIFYING THE PASSWORD
        if (name_attribute === "password") {
            // GETTING VALUE OF CURRENT FIELD
            const password = value.value

            // CHECKING IF THE USER'S PASSWORD MATCHES THE PATTERN

            // ENTER DATA IF USER PASSWORD MATCHES THE PATTERN
            form_data["password"] = password
            password_verification = true
        }
        form_data["computer"] = 1
        form_data["mobile_phone"] = 0
    });

    if (!Object.keys(form_data).includes("profile_picture")) {
        console.log("no profile pic")
        form_data["profile_picture"] = ""
    }

    if (form_data.length === 0) {
        console.log("Please Fill the form")

    } if (form_data.length > 0 && form_data.length < 3) {
        console.log("Please fill the empty fields")

        // CHECKING IF ALL REQUIRED FIELDS HAVE BEEN FILLED
    } if (username_verification == true && password_verification == true && email_verification == true) {
        // ipc.send("reg-user", form_data)
        fetch('http://127.0.0.1:8000/register_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form_data)
        })
            .then(response => response.json())
            .then((data) => {
                console.log(data)

                // THIS PART IS CALLED WHEN ALL DETAILS HAVE BEEN SENT TO THE SERVER

                fromData_toSave = data
                $('#signUp-button-div').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span>Sent</div>').addClass('disabled');
                $('#enterVerificationCode').modal({ backdrop: 'static', keyboard: false })
                verified_email = form_data["email"]
            })
            .catch(error => console.error(error));
        $('#signUp-button-div').click(function () {
            fields.forEach((value, key, parent) => {
                value.disabled = true;
            })
            $('#signUp-button-div').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
        });

    }
    

}

// THIS FUNCTION ALERTS THE MAIN PROCESS TO OPEN THE DAILOG TO ALLOW THE USER TO SELECT A PICTURE
function choose_profile_pic() {
    ipc.send("choose_profile_pic", 1)
}


signUP_button.addEventListener("click", submit_form_data)
pick_profile_picture.addEventListener("click", choose_profile_pic)

// WHEN A PROFILE PICTURE IS SELECTED
ipc.on("change_picture", (event, image_path) => {
    // THIS PART UPDATES THE PROFILE PICTURE AND CONVERTS IT TO BASE_64 TO BE SENT TO SERVER

    // UPDATING PROFILE PICTURE
    var display_profile_picture = "<img id='sign-up-profile-picture' src=" + image_path + " alt=''>"
    profile_picture_div.innerHTML = display_profile_picture

    // CONVERTING TO BASE_64
    base64_image = fs.readFileSync(image_path, { encoding: "base64" })
    form_data["profile_picture"] = base64_image
})

// THIS PART IS CALLED WHEN ALL DETAILS HAVE BEEN SENT TO THE SERVER
// ipc.on("reg_details_recieved", (event, email) => {
//     $('#signUp-button-div').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span>Sent</div>').addClass('disabled');
//     $('#enterVerificationCode').modal({ backdrop: 'static', keyboard: false })
//     verified_email = email
// })


function send_verification_code() {
    // FUNCTION AUTOMATICALLY VERIFIES THE VERIFICATION CODE THAT THE USER HAS TYPED
    code = verification_code_field.value
    if (code.length === 7) {
        $('#show-verification-result').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
        var verification_details = JSON.stringify({ "email": verified_email, "code": code })
        fetch('http://127.0.0.1:8000/verify_code', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: verification_details
        })
            .then(response => response.json())
            .then((data) => {
                console.log(data)
                if (data === 1){
                    // Tells the main process that the code is complete and verification is also complete
                    // So the data is saved and app is restarted
                    $('#show-verification-result').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span style="color:green;">Verification complete</div>').addClass('disabled');
                    $("#enterVerificationCode").modal("hide")
                    ipc.send("sign-up-complete", fromData_toSave)
                } else {
                    $('#show-verification-result').html('<div class="wrond-verification-code"><span><i class="material-icons"></i></span>Verification Code is wrong</div>').addClass('disabled');
                }
            })
            .catch(error => console.error(error));
        console.log(code)
    }
}

// ipc.on("verification_success", (event, results) => {
//     if (Object.keys(results).length > 1) {
//         $('#show-verification-result').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span style="color:green;">Verification complete</div>').addClass('disabled');
//         $("#enterVerificationCode").modal("hide")
//         event.sender.send("sign-up-complete", results)
//     } else if (results === 0) {
//         $('#show-verification-result').html('<div class="wrond-verification-code"><span><i class="material-icons"></i></span>Verification Code is wrong</div>').addClass('disabled');
//     }
// })
