from fastapi import FastAPI, File, UploadFile
import shutil
from typing import Dict
from utils import Utils
from database import DataBase
from datetime import datetime
DB = DataBase()

app = FastAPI()


@app.post("/register_user")
def register_user(user_info: Dict[str, str]):
    """
    Registers users
    user_info: contains the registration information. The user fills the form on the client side and the data is sent
    """

    print(user_info)
    code = Utils.generate_code(7)
    print(f"\n The code is: {code} \n")
    post = {"sid": "", "name": user_info["name"], "email": user_info["email"], "online_status": 1, "verification_code": code, "last_seen": datetime.today(), "joined_date": datetime.today(
    ), "profile_pic": user_info["profile_picture"], "messages_table": user_info["name"]+"msg_table", "verified": 0, "desktop": user_info["computer"], "phone": user_info["mobile_phone"]}
    DB.enter_post(table=DB.users_table, post=post)
    post = Utils.encode(post)

    # SEND VERIFICATION CODE THROUGH EMAIL
    return post


@app.patch("/verify_code")
def verify_user_registration_code(info: Dict[str, str]):
    """
    Checks if the verification code of a newly registered user is correct
    """
    verification_result = 0
    post = DB.find(filter={"email": info["email"]}, table=DB.users_table)
    print(post["verification_code"])
    if post["verification_code"] == info["code"]:
        print("success")
        post = Utils.encode(obj=post)
        DB.update(filter={"email": info["email"]}, update={
                  "$set": {"verified": 1}}, table=DB.users_table)
        verification_result = 1

    return verification_result

@app.post("/uploadfile")
async def create_upload_file(file: UploadFile = File(...)):
    file.file.seek(0, 2)  # Move the file pointer to the end of the file
    file_size = file.file.tell()  # Get the current position of the file pointer
    file.file.seek(0)
    print(file_size)
    with open(file=file.filename, mode="wb") as buffer:
        shutil.copyfileobj(file.file,buffer)
    return True