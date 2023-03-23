module.exports.settings_html = `<div class="modal-dialog modal-dialog-centered" role="figure">
<div class="requests tab-content">
    <div class="tab-pane fade active show" id="mainSettingsPage">
        <div class="title">
            <h1>Settings</h1>
            <div id="settings-toolbar">
                <div class="dropdown">
                    <button type="button" class="btn more-account-options" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="material-icons">more_vert</i></button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <button id="add-account" class="dropdown-item connect" name="1"><i class="material-icons">add</i>Add account</button>
                        <button id="log-out" class="dropdown-item connect" name="1"><i class="material-icons">exit_to_app</i>Log out</button>
                    </div>
                </div>
                <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>

            </div>
        </div>
        <div class="search contacts-search">
            <form class="form-inline position-relative">
                <button type="button" class="btn btn-link loop contacts-search"><i class="material-icons">search</i></button>
                <input type="search" class="form-control" id="people" placeholder="Search for people...">
            </form>
        </div>
        <div class="settings-content">
            <div class="active-account">
                <img id="setting-profile-picture" src="dist/img/avatars/avatar-female-1.jpg" alt="" class="settings-profile-photo">
                <div id="active-account-name-and-status">
                    <h6 id="username">Username</h6>
                    <tbody>Online</tbody>
                </div>
            </div>
            <div class="settings-category">

                <a href="#editProfile" data-toggle="tab" class="btn setting-btn"><i class="material-icons setting-material-icon">info</i>Edit Profile</a>
                <a href="#notification" data-toggle="tab" class="btn setting-btn"><i class="material-icons setting-material-icon">notifications_none</i>Notification</a>
                <a class="btn setting-btn"><i class="material-icons setting-material-icon">colorize</i>Appearance</a>
                <a class="btn setting-btn"><i class="material-icons setting-material-icon">chat_bubble_outline</i>Chat Settings</a>
                <a class="btn setting-btn"><i class="material-icons setting-material-icon">lock_outline</i>Privacy & Security</a>
            </div>
            <div class="settings-category no-bottom-border">
                <button class="btn setting-btn"><i class="material-icons setting-material-icon">help</i>Help</button>
                <button class="btn setting-btn"><i class="material-icons setting-material-icon">info</i>About</button>
            </div>
            
        </div>
    </div>
    <div class="tab-pane fade" id="editProfile">
        <div class="title">
            <h1>Edit Profile</h1>
            <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>
        </div>
        <div class="set-profile-photo-area">
            <img src="dist/img/avatars/avatar-female-1.jpg" alt="Profile Photo" class="settings-profile-photo center-profile-photo">
            <button type="button" class="btn change-profile-photo" id="change-profile-photo-user">Change Profile Photo</button>									
        </div>
        <div class="edit-profile">
            <div class="edit-profile-option">
                <a href="" class="edit-profile-btn"><i class="material-icons edit-profile-material-icon">account_circle</i></a>
                <div id="edit-profile-name">
                    <h6>Username</h6>
                    <tbody>Name</tbody>
                </div>
            </div>
            <div class="edit-profile-option border-bottom">
                <a href="" class="edit-profile-btn"><i class="material-icons edit-profile-material-icon">account_circle</i></a>
                <div id="edit-profile-name">
                    <h6>Contact</h6>
                    <tbody>Phone or Email</tbody>
                </div>
            </div>
        </div>
    </div>
    <div class="tab-pane fade" id="notification">
        <div class="title">
            <a id="back-to-main" href="#mainSettingsPage" type="button" class="btn go-back" data-toggle="tab" aria-label="Close"><i class="material-icons">arrow_back</i></a>
            <h1>Notification</h1>
            <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>
        </div>
    </div>
</div>
</div>`