import { useEffect, useState } from "react"
import { useTimer } from "react-timer-hook";
import useSound from "use-sound";
import {Button, InputLabel, TextField } from "@mui/material";
// @ts-ignore
import operationEndSound from './../assets/operation_end.mp3';
// @ts-ignore
import restEndSound from './../assets/rest_end.mp3';
import styles from "../css/Timer.module.css"

const Timer = ({onTimerUpdate}: {onTimerUpdate: (number: number) => void}) => {
  const [operatingMinutes, setOperatingMinutes] = useState<number>(25)
  const [restMinutes, setRestMinutes] = useState<number>(5)
  const [isRestSetting, setIsRestSetting] = useState(false)
  const [operationSoundPlay] = useSound(operationEndSound, {volume: 0.3});
  const [restSoundPlay] = useSound(restEndSound, {volume: 0.3});
  const [isInputHidden, setIsInputHidden] = useState(false)

  const settingDateObject = (min: number) => {
    const date = new Date()
    console.log(date)
    date.setSeconds(date.getSeconds() + min * 60)
    return date
  }

  const soundPlay = () => {
    isRestSetting
      ? (() => {
        restSoundPlay()
        restart(settingDateObject(restMinutes), false)
        })()
      : (() => {
        operationSoundPlay()
        restart(settingDateObject(operatingMinutes), false)
      })()
  }

  const {
    totalSeconds,
    seconds,
    minutes,
    isRunning,
    start,
    pause,
    resume,
    restart,
  } = useTimer({
    expiryTimestamp: isRestSetting ? settingDateObject(restMinutes) : settingDateObject(operatingMinutes),
    onExpire: soundPlay
  });

  useEffect(() => {
    pause()
  }, [])

  useEffect(() => {
    !isRestSetting && restart(settingDateObject(operatingMinutes), false)
  }, [operatingMinutes])

  useEffect(() => {
    isRestSetting && restart(settingDateObject(restMinutes), false)
  }, [restMinutes])

  useEffect(() => {
    onTimerUpdate(totalSeconds)
  }, [totalSeconds])

  useEffect(() => {
    isRestSetting ? restart(settingDateObject(restMinutes), false) : restart(settingDateObject(operatingMinutes), false)
  }, [isRestSetting])

  useEffect(() => {
  }, [operatingMinutes])

  const switchSetting = async () => {
    setIsRestSetting(!isRestSetting)
  }

  const selectedRestart = (isAutoStart: boolean) => {
    isRestSetting ? restart(settingDateObject(restMinutes), isAutoStart) : restart(settingDateObject(operatingMinutes), isAutoStart)
  }

  return (
    <div className={isRestSetting ? styles.restTimer : styles.operatingTimer}>
      <h1>ポモドーロタイマー </h1>
      <div style={{fontSize: '100px'}}>
        <span>{minutes}</span>:<span>{seconds}</span>
      </div>
      <Button sx={{marginBottom: "10px"}} variant="contained" size={"small"} color="inherit" onClick={() => {setIsInputHidden(!isInputHidden)}}>Hidden</Button>
      { isInputHidden ||
        <div style={{backgroundColor: "white", padding:"20px"}}>
          <div style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
            <InputLabel>作業時間</InputLabel>
            <TextField type="number" value={operatingMinutes} color="primary" onChange={(event) => {setOperatingMinutes(Number(event.target.value))}}/>
          </div>
          <div style={{display: "flex", alignItems: "center", justifyContent: "center"}}>
            <InputLabel>休憩時間</InputLabel>
            <TextField type="number" value={restMinutes} color="primary" onChange={(event) => {setRestMinutes(Number(event.target.value))}}/>
          </div>
        </div>
      }
      <div style={{backgroundColor: "white", display: "flex", justifyContent: "space-around", padding: "20px"}}>
        <Button variant="contained" size={"small"} onClick={start}>Start</Button>
        <Button variant="contained" size={"small"} color="error" onClick={pause}>Pause</Button>
        <Button variant="contained" size={"small"} color="success" onClick={() => {
          switchSetting()
          selectedRestart(false)
        }}>Switching</Button>
        <Button variant="contained" size={"small"} color="secondary" onClick={() => selectedRestart(false)}>Reset</Button>
      </div>
    </div>
  )
}

export default Timer