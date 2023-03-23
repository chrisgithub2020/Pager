import eventlet
import socketio
import os
import json
from utils import Utils
from database import DataBase
from datetime import datetime
from threading import Thread
media_messages_to_be_sent = {}
users_online = {}

DB = DataBase()

sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})


@sio.event
def connect(sid, environ):
    print('connect ', sid)


@sio.event
def update_status(sid, filter):
    if bool(filter):
        users_online[filter["email"]] = sid
        print(users_online)
        doc = DB.update(filter={"email": filter["email"]}, update={
                        "$set": {"online_status": 1, "sid": sid}}, table=DB.users_table)
        # print("Updating this user: "+doc["sid"])
        print("This is my email "+filter["email"])

        file = "./"+filter["email"]+".pagemsg"
        isFile = os.path.isfile(file)

        if isFile:
            json_msg = json.load(file)
            print(json_msg)




@sio.event
def check_if_acc_exist(sid, param):
    post = DB.find(filter={"email": param["email"]}, table=DB.users_table)

    if post != None:
        contact = Utils.encode(post)
        print(contact)

        if param["request_type"] == "message_from_unknown_source":
            sio.emit(event="verify_acc", data=contact, to=sid)
        else:
            contact["user_saving_name"] = param["name"]
            sio.emit(data=contact, to=sid, event="verify_acc_contact")


@sio.event
def recieve_message(sid, msg_data):
    print(msg_data)
    message_to_save = {"id": msg_data["uuid"], "message": msg_data["message"],
                       "time": msg_data["time"], "type": "txt", "sender": msg_data["from"], "recipient": msg_data["to"]}
    recipient = DB.find(filter={"email": msg_data["to"]}, table=DB.users_table)
    if recipient != None:
        if recipient["online_status"] == 0:
            json_content = ''

            if os.path.exists(f"./saved-messages/{recipient['email']}.json"):

                # When the file that the saved messages are kept in for the user does exist

                with open(file=f"./saved-messages/{recipient['email']}.json", mode="r") as file:
                    json_content = json.load(file)

                if bool(json_content) == False:
                    # File does not have any message saved
                    print("Natin in json file")
                    json_content = {msg_data["from"]: message_to_save}
                    print(json_content)
                else:
                    # File has message saved
                    print("Something dey")

                    if msg_data["from"] in json_content:
                        # Already contains message from the sender
                        print("This key already exists")

                        if isinstance(json_content[msg_data["from"]], list):
                            # Contains multiple messages from the sender
                            json_content[msg_data["from"]].append(
                                message_to_save)
                        else:
                            # Has just one message from the sender
                            msg_list = [json_content[msg_data["from"]]]
                            msg_list.append(message_to_save)

                            json_content[msg_data["from"]] = msg_list
                            print(json_content)
                    else:
                        # Does not contain any message from the sender
                        print("The key does not exist")
                        json_content[msg_data["from"]] = message_to_save
                        print(json_content)

                # Saving messages
                with open(file=f"./saved-messages/{recipient['email']}.json", mode="w") as file:
                    json.dump(json_content, file)

            else:
                # When the file that the saved messages are kept in for the user does not exist
                json_content = {msg_data["from"]: message_to_save}

                # Saving messages
                with open(file=f"./saved-messages/{recipient['email']}.json", mode="w") as file:
                    json.dump(json_content, file)
        else:
            sio.emit(event="recieve_message",
                     data=msg_data, to=recipient["sid"])
            print("Sending message to this user " + recipient["email"])


@sio.event
def send_saved_messages(sid, code):
    if code == 102:
        requester = DB.find(filter={"sid": sid}, table=DB.users_table)
        if os.path.isfile(f"./saved-messages/{requester['email']}.json"):

            with open(file=f"./saved-messages/{requester['email']}.json", mode="r") as file:
                messages = json.load(file)
                sio.emit("server_saved_messages", messages, sid)


@sio.event
def send_media(sid, msg_data: dict):
    file_extension = os.path.splitext(msg_data['path'][0])[1]
    print(file_extension, "The file extension")
    # msg_data["media_link"] = ''
    msg_data["path"] = f"{msg_data['uuid']}.{file_extension}"
    print(msg_data["path"])
    msg_data["sender"] = msg_data["from"]
    msg_data.pop("from")
    msg_data["recipient"] = msg_data["to"]
    msg_data.pop("to")

    media_messages_to_be_sent[msg_data["uuid"]] = msg_data

    with open(file=f"{msg_data['uuid']}.{os.path.splitext(msg_data['path'])[1]}", mode="w") as file:
        pass

    msg_data["id"] = msg_data["uuid"]
    msg_data.pop("uuid")

    recipient = DB.find(
        filter={"email": msg_data["recipient"]}, table=DB.users_table)
    if recipient != None:
        if recipient["online_status"] == 0:
            json_content = ''
            with open(file=f"./saved-messages/{recipient['email']}.json", mode="r") as file:
                json_content = json.load(file)

            if bool(json_content) == False:
                print("Natin in json file")
                json_content = {msg_data["from"]: msg_data}
                print(json_content)
            else:
                print("Something dey")
                if msg_data["from"] in json_content:
                    print("This key already exists")

                    if isinstance(json_content[msg_data["from"]], list):
                        json_content[msg_data["from"]].append(msg_data)
                    else:
                        msg_list = [json_content[msg_data["from"]]]
                        msg_list.append(msg_data)

                        json_content[msg_data["from"]] = msg_list
                        print(json_content)
                else:
                    print("The key does not exist")
                    json_content[msg_data["from"]] = msg_data
                    print(json_content)

            # Saving messages
            with open(file=f"./saved-messages/{recipient['email']}.json", mode="w") as file:
                json.dump(json_content, file)


@sio.event
def sign_in(sid, details):
    post = DB.find(filter={"email": details["email"]}, table=DB.users_table)
    if post != None:
        DB.update(filter={"email": details["email"]}, update={
                  "$set": {"online_status": 1}}, table=DB.users_table)
        sio.emit(data=Utils.encode(post), to=sid, event="sign-check-complete")

    elif post == None:
        sio.emit(data=False, to=sid, event="sign-check-complete")


@sio.event
def create_clique(sid, info):
    """
    Adds the newly created clique to the database

    It also start a thread to add the members of the clique who are online to the room
    """
    print(info)
    # Commented beacause i am testing
    admin = DB.find(filter={"sid": sid}, table=DB.users_table)
    post = {
        "name": info["name"],
        "link": info["link"],
        "description": info["about"],
        "members": info["members"],
        "admins": ["chris@gmail.com"],
        "settings": info["settings"],
        "profile_pic": info["profile_pic"],
        "roomname": info["link"]
    }
    sio.enter_room(sid=sid, room=info["link"])
    DB.enter_post(table=DB.clique_table, post=post)
    post = Utils.encode(post)
    sio.emit(event="creation-done", data=post, to=sid)

    for m in post["members"]:
        if bool(users_online[m]):
            sio.enter_room(sid=users_online[m], room=info["link"])
        else:
            print(m + " not online")
    sio.emit(event="added_to_clique", data=post,
             room=info["link"], skip_sid=sid)


@sio.event
def send_clique_message(sid, message):
    clique = DB.find(filter={"link": message["to"]}, table=DB.clique_table)
    for user in clique["members"]:
        recipient = DB.find(filter={"email": user}, table=DB.users_table)
        if recipient != None:
            if recipient["online_status"] == 0:
                with open(file=f"./saved-messages/{recipient['email']}.json", mode="w") as file:
                    json.dump(message, file)
            else:
                sio.emit(data=message, event="recieve_clique_message",
                         to=recipient["sid"])


@sio.event
def disconnect(sid):
    print('disconnect ', sid)
    DB.update(filter={"sid": sid}, update={
              "$set": {"online_status": 0,"last_seen":datetime.today()}}, table=DB.users_table)
    
    ## Removes you from the dictionary that keeps track of users thath are online
    user = DB.find(filter={"sid":sid},table=DB.users_table)
    users_online.pop(user["email"])
    print(users_online)


    


@sio.event
def send_ice_cand(sid, obj):
    print("INCOMING CALL")
    callee = DB.find(filter={"email": obj["email"]}, table=DB.users_table)
    if callee != None:
        if callee["online_status"] == 1:
            sio.emit("icecandidate", obj["cand"], callee["sid"])


@sio.event
def send_offer(sid, offer_obj):
    callee = DB.find(
        filter={"email": offer_obj["email"]}, table=DB.users_table)
    caller = DB.find(filter={"sid": sid}, table=DB.users_table)
    if callee != None:
        if callee["online_status"] == 1:
            offer_obj = {
                "answer": offer_obj["answer"], "email": caller["email"]}
            sio.emit("rtc-offer", offer_obj, callee["sid"])


@sio.event
def send_answer(sid, answer_obj):
    caller = DB.find(
        filter={"email": answer_obj["email"]}, table=DB.users_table)
    caller = DB.find(filter={"sid": sid}, table=DB.users_table)
    if caller != None:
        if caller["online_status"] == 1:
            answer_obj = {
                "answer": answer_obj["answer"], "email": caller["email"]}
            sio.emit("rtc-offer", answer_obj, caller["sid"])


@sio.event
def send_media_stream(sid, media_stream):
    if media_stream["data"] == "done":
        pass
    else:
        print(media_stream["data"])
        with open(media_messages_to_be_sent[media_stream["uuid"]]["path"], 'a+') as file:
            file.write(media_stream)

    recipient = DB.find(filter={
                        "email": media_messages_to_be_sent[media_stream["uuid"]]["to"]}, table=DB.users_table)
    if recipient != None:
        if recipient["online_status"] == 0:
            pass
        else:
            sio.emit(data=media_messages_to_be_sent[media_stream["uuid"]],
                     event="recieve_media_msg", to=recipient["sid"])


def thread_for_joining_cliques(sid, cliques):
    for clique in cliques:
        clique = DB.find(filter={"name": clique}, table=DB.clique_table)
        sio.enter_room(sid=sid, room=clique["roomname"])


@sio.event
def join_clique_rooms(sid, clique_list):
    thread = Thread(target=thread_for_joining_cliques,
                    args=(sid, clique_list), daemon=True)
    thread.start()


if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)
