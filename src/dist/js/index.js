var main_class = document.getElementsByClassName("main")[0]
var show_slide_menu = document.getElementById("show_slide_menu")
var bottom = document.getElementsByClassName("bottom")[0]
var go_back_button = document.getElementById("back-to-main")

function returnToMainSettingsPage(){
    $( "#mainSettingsPage" ).load(window.location.href + " #mainSettingsPage" );
    console.log(window.location)
}

/* Set the width of the side navigation to 250px */
function openNav() {
    document.getElementById("sidenav").style.width = "350px";
}
  
/* Set the width of the side navigation to 0 */
function closeNav() {
document.getElementById("sidenav").style.width = "0";
}



show_slide_menu.addEventListener("click",openNav)
main_class.addEventListener("click",closeNav)
// go_back_button.addEventListener("click",returnToMainSettingsPage)

