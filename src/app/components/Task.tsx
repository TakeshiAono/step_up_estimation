import { Button, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "../css/Task.module.css"
import { useEffect, useState } from "react";
import axios from "axios";
import _, { round } from "lodash";

interface props {
  tickets: any;
}

const Task = ({seconds, id}: {seconds: number, id: number}) => {
  const [tickets, setTickets] = useState([1,2,3])
  const [isOperatingTask, setIsOperatingTask] = useState(false)
  const [title, setTitle] = useState("")
  const [isParentTask, setIsParentTask] = useState(false)
  const [operatingTime, setOperatingTime] = useState(0)

  useEffect(() => {
    isOperatingTask && setOperatingTime(operatingTime + 1)
  }, [seconds])

  const taskTypes = {
    "初回タスク": 0,
    "調査後タスク": 1,
    "調査後漏れタスク": 2,
    "不明": 3
  }
  const status = {"未着手": 0, "作業中": 1, "完了": 2}

  const getData = async () => {
    const response = await axios.get("/api/tickets/1");
    console.log(response);
    setTickets(response.data[0].title)
  };

  const switchOperatingTask = () => {
    setIsOperatingTask(!isOperatingTask)
  }

  const switchParentTask = () => {
    setIsParentTask(!isParentTask)
  }

  return (
    <div className={styles.task}>
      <div>
        {
          isParentTask || (isOperatingTask
            ? <Button variant="contained" color="warning" onClick={switchOperatingTask}>作業終了</Button>
            : <Button variant="contained" color="success" onClick={switchOperatingTask}>作業開始</Button>
          )
        }
      </div>
      <div className={styles.inputBlock}>
        <InputLabel>チケット番号</InputLabel>
        <Select defaultValue={1}>
          {tickets.map((ticket)=>(<MenuItem key={ticket} value={ticket}>{ticket}</MenuItem>))}
        </Select>
      </div>
      <div className={styles.inputBlock}>
        <InputLabel>状況</InputLabel>
        <Select className={styles.shortInput} defaultValue={status["未着手"]}>
          {_.map(status, (value, key)=>(<MenuItem key={key} value={value}>{key}</MenuItem>))}
        </Select>
      </div>
      <div className={styles.taskColumn}>
        <InputLabel>タスク種別</InputLabel>
        <Select className={styles.shortInput} defaultValue={taskTypes["初回タスク"]}>
          {_.map(taskTypes, (value, key)=>(<MenuItem key={key} value={value}>{key}</MenuItem>))}
        </Select>
      </div>
      <div className={styles.taskColumn}>
        <InputLabel>タイトル</InputLabel>
        <TextField variant="outlined" value={title} onChange={(event) => {setTitle(event.target.value)}}/>
      </div>
      {
        isParentTask
          ? <Button variant="contained" color="error" onClick={switchParentTask}>親タスク解除</Button>
          : <Button variant="contained" color="success" onClick={switchParentTask}>子タスク追加</Button>
      }
      {
        isParentTask || (
          <>
            <div className={styles.taskColumn}>
              <InputLabel>初回完了予想時間(h)</InputLabel>
              <Select className={styles.shortInput} defaultValue={1}>
                {_.map([1,2,3,4], (value)=>(<MenuItem key={value} value={value}>{value}</MenuItem>))}
              </Select>
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>初回予想技術スパイク時間(h)</InputLabel>
              <Select className={styles.shortInput} defaultValue={1}>
                {_.map([1,2,3,4], (value)=>(<MenuItem key={value} value={value}>{value}</MenuItem>))}
              </Select>
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>初回予想技術スパイク時間(h)</InputLabel>
              <Select className={styles.shortInput} defaultValue={1}>
                {_.map([1,2,3,4], (value)=>(<MenuItem key={value} value={value}>{value}</MenuItem>))}
              </Select>
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>調査内容</InputLabel>
              <TextField variant="outlined" multiline />
            </div>
            <div className={styles.operatedTime}>
              <InputLabel>実働時間(調査時間を含む)</InputLabel>
              <p style={{fontSize: "40px", alignItems: "center", margin: "0px"}}>
                {Math.floor(operatingTime/3600)}:{Math.floor(operatingTime/60)}:{operatingTime % 60}
              </p>
            </div>
          </>
        )
      }
    </div>
  );
};

export default Task;
