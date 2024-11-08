import {
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Slider,
} from "@mui/material";
import Radio from "@mui/joy/Radio";
import RadioGroup from "@mui/joy/RadioGroup";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import _ from "lodash";
import {
  DateTimePicker,
  LocalizationProvider,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Statuses, TaskTypes } from "@/app/constants/TaskConstants";
import type { Task } from "@/schema/zod";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { GaugeComponent } from "react-gauge-component";

import TaskModal from "./TaskModal";
import TaskOperationMessage from "./TaskOperationMessage";
import styles from "../css/Task.module.css";
import {
  createTimeAndOperatingTime,
  mutateTimeAndOperatingTime,
  saveTaskTerm,
} from "../utils/apiUtil";
import useTaskNotification from "../hooks/useTaskNotification";

type Props = {
  seconds: number;
  operatingTaskId: number;
  onSelectOperatingTask: () => void;
  task: Task;
  onDelete: (task: Task) => void;
  isMinimum: boolean;
  onAddTask: (id: number) => void;
  onAddTasks: (id: number, taskTitles: string[]) => void;
  onModalOpen: (isModalOpen: boolean) => void;
  onSelectedModalItem: (taskItem: any) => void;
  createFlg: boolean;
};

type TaskItem = {
  id: number;
  title: string;
  hour: number;
  ticketItems: any[];
};

const Task = ({
  seconds,
  operatingTaskId,
  onSelectOperatingTask,
  task,
  achievements,
  plans,
  feedbacks,
  checks,
  onDelete,
  isMinimum,
  onAddTask,
  onModalOpen,
  onSelectedModalItem,
  createFlg,
  onAddTasks,
  ticketItems,
}: Props) => {
  const [title, setTitle] = useState(task.title);
  const [isParentTask, setIsParentTask] = useState(false);
  const [pastOperatingTime, setPastOperatingTime] = useState(
    achievements.histories &&
      achievements.histories.reduce((prev, next) => {
        return dayjs(next.createdAt).startOf("day") < dayjs().startOf("day")
          ? prev + next.operatingTime
          : prev;
      }, 0),
  );
  const [pastSurveyTime, setPastSurveyTime] = useState(
    achievements.histories &&
      achievements.histories.reduce((prev, next) => {
        return dayjs(next.createdAt).startOf("day") < dayjs().startOf("day")
          ? prev + next.surveyTime
          : prev;
      }, 0),
  );
  const [operatingTime, setOperatingTime] = useState(
    achievements.histories &&
      achievements.histories.reduce(
        (prev, next) => prev + next.operatingTime,
        0,
      ),
  );
  const [surveyTime, setSurveyTime] = useState(
    achievements.histories &&
      achievements.histories.reduce((prev, next) => prev + next.surveyTime, 0),
  );
  const [isEditing, setIsEditing] = useState(false);
  // const [ticketItems, setTicketItems] = useState<any>([]);
  const [status, setStatus] = useState(task.status);
  const [runState, setRunState] = useState("survey");
  const [isSurveyTask, setIsSurveyTask] = useState<boolean>(task.isSurveyTask);
  const [type, setType] = useState<number>(task.type);
  const [ticketId, setTicketId] = useState(task.ticketId);
  const [parentId, setParentId] = useState(task.parentId);
  const [predictionSurveyTimeOfFirst, setPredictionSurveyTimeOfFirst] =
    useState(task.plans[0].predictionSurveyTimeOfFirst);
  const [predictionRequiredTimeOfFinal, setPredictionRequiredTimeOfFinal] =
    useState(task.plans[0].predictionRequiredTimeOfFinal);
  const [predictionRequiredTimeOfFirst, setPredictionRequiredTimeOfFirst] =
    useState(task.plans[0].predictionRequiredTimeOfFirst);
  const [predictionSurveyTimeOfFinal, setPredictionSurveyTimeOfFinal] =
    useState(task.plans[0].predictionSurveyTimeOfFinal);
  const [surveyDetail, setSurveyDetail] = useState(task.plans[0].surveyDetail);
  const [isSelectToAddTask, setIsSelectToAddTask] = useState(false);
  const [childrenTaskTitles, setChildrenTaskTitles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([
    { id: 0, title: "", hour: 0 },
  ]);

  const isInitialRender = useRef(true);
  const historyCreated = useRef(
    achievements.histories?.filter(
      (history) =>
        dayjs(history.createdAt).startOf("day").format().toString() ===
        dayjs().startOf("day").format().toString(),
    ).length > 0,
  );
  const taskTermId = useRef(uuid());
  const isOperatingTask = operatingTaskId == task.id;
  const terms = useRef(
    task.operatedTermsJsonForTimeBarChart?.filter(
      (term) =>
        dayjs(term.start).startOf("day").toString() ===
          dayjs().startOf("day").toString() &&
        dayjs(term.start).toString() !== dayjs(term.end).toString(),
    ),
  );

  const [progressRate, setProgressRate] = useState(task.progressRate);

  const doneTimeRate = () => {
    if (
      predictionRequiredTimeOfFirst == null ||
      predictionRequiredTimeOfFirst == 0
    ) {
      return 0;
    }
    return Math.round(
      ((operatingTime + surveyTime) / 3600 / predictionRequiredTimeOfFirst) *
        100,
    );
  };

  useTaskNotification(task, doneTimeRate(), progressRate);

  useEffect(() => {
    if (!isInitialRender.current) {
      mutationTask();
    }
  }, [status]);

  // TODO: プログレスバーの値を変更するごとにリクエストが飛ぶのでどうにかしないと
  useEffect(() => {
    if (!isInitialRender.current) {
      mutationTask();
    }
  }, [progressRate]);

  useEffect(() => {
    if (operatingTaskId == task.id) {
      if (isSurveyTask) {
        setSurveyTime(surveyTime + 1);
      } else {
        setOperatingTime(operatingTime + 1);
      }
    }
  }, [seconds]);

  useEffect(() => {
    if (
      operatingTime % 60 === 1 &&
      !isInitialRender.current &&
      isOperatingTask
    ) {
      //NOTE:1分ごとに自動保存されるようにする。
      updateTime();
      saveTermForBarChart();
    }
  }, [operatingTime]);

  useEffect(() => {
    if (surveyTime % 60 === 1 && !isInitialRender.current && isOperatingTask) {
      //NOTE:1分ごとに自動保存されるようにする。
      updateTime();
      saveTermForBarChart();
    }
  }, [surveyTime]);

  useEffect(() => {
    if (isInitialRender.current) isInitialRender.current = false;
  }, []);

  const saveTermForBarChart = async () => {
    saveTaskTerm(task, taskTermId.current);
  };

  const switchOperatingTask = () => {
    operatingTaskId == task.id
      ? onSelectOperatingTask(null)
      : onSelectOperatingTask(task.id);
  };

  const updateTime = async () => {
    if (historyCreated.current) {
      return await mutateTimeAndOperatingTime(
        task,
        surveyTime,
        operatingTime,
        pastSurveyTime,
        pastOperatingTime,
      );
    } else {
      historyCreated.current = true;
      return await createTimeAndOperatingTime(
        task,
        surveyTime,
        operatingTime,
        pastSurveyTime,
        pastOperatingTime,
      );
    }
  };

  const mutationTask = async () => {
    return await axios.patch(`http://localhost:3001/api/tasks/${task.id}`, {
      seconds: seconds,
      isSurveyTask: isSurveyTask,
      status: status,
      type: type,
      progressRate: progressRate,
      title: title,
      parentId: parentId,
      ticketId: ticketId,
      plan: {
        id: plans.id,
        predictionRequiredTimeOfFirst: predictionRequiredTimeOfFirst,
        predictionRequiredTimeOfFinal: predictionRequiredTimeOfFinal,
        predictionSurveyTimeOfFirst: predictionSurveyTimeOfFirst,
        predictionSurveyTimeOfFinal: predictionSurveyTimeOfFinal,
        surveyDetail: surveyDetail,
      },
      achievement: {
        id: achievements.id,
        operatingTime: operatingTime,
        surveyTime: surveyTime,
      },
      check: {
        id: checks.id,
      },
      feedback: {
        id: feedbacks.id,
      },
    });
  };

  return (
    <div
      className={styles.taskWraper}
      style={
        isEditing
          ? { backgroundColor: "white" }
          : { backgroundColor: "lightgray" }
      }
    >
      <TaskOperationMessage
        isSurveyTerm={isSurveyTask}
        isPredictionRequiredTimeOfFirst={!!predictionRequiredTimeOfFirst}
        isSelectedTicket={!!ticketId}
      />
      <Stack direction="row" justifyContent="start">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>実質進捗率</span>
          <GaugeComponent
            arc={{
              subArcs: [
                {
                  limit: doneTimeRate() < 1 && 0,
                  color: "#EA4228",
                  showTick: true,
                },
                {
                  limit: 100,
                  color: "#5BE12C",
                  showTick: true,
                },
              ],
            }}
            value={progressRate}
            style={{ width: 200 }}
          />
          <div style={{ width: "150px" }}>
            <Slider
              step={10}
              value={progressRate}
              onChange={(e) => {
                setProgressRate(e.target.value);
              }}
            />
          </div>
          {/* {progressRate} */}
        </div>
        {doneTimeRate() > 1 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span>最低進捗率</span>
            <GaugeComponent
              arc={{
                subArcs: [
                  {
                    limit: progressRate > 99 ? 99 : progressRate,
                    color: "#5BE12C",
                    showTick: true,
                  },
                  {
                    limit: 100,
                    color: "#EA4228",
                    showTick: true,
                  },
                ],
              }}
              value={doneTimeRate()}
              style={{ width: 200 }}
            />
          </div>
        )}
      </Stack>
      {
        <div className={styles.inputBlock} style={{ marginBottom: "10px" }}>
          <span style={{ marginLeft: "10px" }}>チケット: </span>
          <Select
            disabled={!isEditing}
            value={ticketId}
            defaultValue={1}
            onChange={(e) => {
              setTicketId(e.target.value);
            }}
            sx={{ height: "40px", width: "500px" }}
          >
            {/* TODO: ticketsはstoreで状態管理させる */}
            {ticketItems.map((ticket) => {
              return (
                ticket.status != Statuses.Done && (
                  <MenuItem
                    disabled={!isEditing}
                    key={ticket.id}
                    value={ticket.id}
                  >
                    {ticket.title}
                  </MenuItem>
                )
              );
            })}
          </Select>
        </div>
      }
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          gap: "5px",
          margin: "0px 20px",
        }}
      >
        <Link
          style={{ display: "inline-block", marginLeft: "30px" }}
          href={`/tasks/${task.id}`}
        >
          タスクNo.{task.id}
        </Link>
        <div>
          {isParentTask ||
            (operatingTaskId == task.id ? (
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  switchOperatingTask();
                  saveTermForBarChart();
                  taskTermId.current = uuid();
                }}
              >
                作業終了
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  switchOperatingTask();
                  saveTermForBarChart();
                  taskTermId.current = uuid();
                }}
              >
                作業開始
              </Button>
            ))}
        </div>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          子タスク追加
        </Button>
        <div>
          {isEditing ? (
            <Button
              variant="contained"
              color="info"
              onClick={() => {
                mutationTask();
                setIsEditing(!isEditing);
              }}
            >
              編集完了
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                mutationTask();
                setIsEditing(!isEditing);
              }}
            >
              編集
            </Button>
          )}
        </div>
        <div style={{ marginLeft: "20px" }}>
          {status != Statuses.Done ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setStatus(Statuses.Done);
              }}
            >
              タスク完了
            </Button>
          ) : (
            <Button
              variant="contained"
              color="inherit"
              onClick={() => {
                setStatus(Statuses.Run);
              }}
            >
              実施中に戻す
            </Button>
          )}
          {
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                onDelete(task);
              }}
              sx={{ marginLeft: "10px" }}
            >
              削除
            </Button>
          }
        </div>
      </div>
      {/* {JSON.stringify(terms.current)} */}
      {/* aa{JSON.stringify(task.operatedTermsJsonForTimeBarChart.filter(term => dayjs(term.start).startOf("day").toString() === dayjs().startOf("day").toString()))} */}
      {isEditing && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {terms.current?.map((term) => {
            return (
              <>
                {/* <DateCalendar defaultValue={dayjs()} disableFuture /> */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div>
                    <TimePicker
                      defaultValue={dayjs(term.start)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div style={{ display: "inline-block" }}>〜</div>
                  <div>
                    <TimePicker
                      defaultValue={dayjs(term.end)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </>
            );
          })}
        </LocalizationProvider>
      )}
      <div className={styles.task}>
        <FormControl>
          <RadioGroup
            defaultValue="outlined"
            name="radio-buttons-group"
            value={isSurveyTask}
          >
            <Radio
              value={true}
              label="調査中"
              variant="outlined"
              onChange={() => {
                mutationTask();
                setIsSurveyTask(true);
              }}
            />
            <Radio
              value={false}
              label="実装中"
              variant="outlined"
              disabled={!predictionRequiredTimeOfFirst}
              onChange={() => {
                mutationTask();
                setIsSurveyTask(false);
              }}
            />
          </RadioGroup>
        </FormControl>
        <div className={styles.taskColumn}>
          <InputLabel>タイトル</InputLabel>
          <TextField
            variant="outlined"
            disabled={!isEditing}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            multiline={true}
          />
        </div>
        <div className={styles.operatedTime}>
          <InputLabel>調査時間</InputLabel>
          <p style={{ fontSize: "30px", alignItems: "center", margin: "0px" }}>
            {Math.floor(surveyTime / 3600)}:{Math.floor((surveyTime / 60) % 60)}
            :{surveyTime % 60}
          </p>
        </div>
        <div className={styles.operatedTime}>
          <InputLabel>実働時間</InputLabel>
          <p style={{ fontSize: "30px", alignItems: "center", margin: "0px" }}>
            {Math.floor(operatingTime / 3600)}:
            {Math.floor((operatingTime / 60) % 60)}:{operatingTime % 60}
          </p>
        </div>
        {isSurveyTask && (
          <div className={styles.taskColumn} style={{ marginRight: "20px" }}>
            <InputLabel>調査内容</InputLabel>
            <TextField
              value={surveyDetail}
              disabled={!isEditing}
              variant="outlined"
              multiline
              onChange={(event) => {
                setSurveyDetail(event.target.value);
              }}
              sx={{ width: "400px" }}
            />
          </div>
        )}
        <div className={styles.inputBlock}>
          <InputLabel>状況</InputLabel>
          <Select
            disabled={!isEditing}
            className={styles.shortInput}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
            }}
          >
            {_.map(Statuses, (value, key) => (
              <MenuItem key={key} value={value}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className={styles.taskColumn}>
          <InputLabel>タスク種別</InputLabel>
          <Select
            disabled={!isEditing}
            className={styles.shortInput}
            value={type}
            defaultValue={TaskTypes.FirstTask}
            onChange={(event) => {
              setType(event.target.value);
            }}
          >
            {_.map(TaskTypes, (value, key) => (
              <MenuItem key={key} value={value}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className={styles.taskColumn}>
          <InputLabel>初回完了予想時間</InputLabel>
          <OutlinedInput
            type="number"
            sx={{ width: "100px" }}
            inputProps={{
              min: 0,
            }}
            value={predictionRequiredTimeOfFirst}
            disabled={!isEditing}
            onChange={(e) => {
              setPredictionRequiredTimeOfFirst(Number(e.target.value));
            }}
            // endAdornment={<InputAdornment position="end">h</InputAdornment>}
          />
        </div>
        {isMinimum || (
          <>
            <div className={styles.taskColumn}>
              <InputLabel>最終完了予想時間</InputLabel>
              <OutlinedInput
                type="number"
                sx={{ width: "100px" }}
                inputProps={{
                  min: 0,
                }}
                value={predictionRequiredTimeOfFinal}
                disabled={!isEditing}
                onChange={(e) => {
                  setPredictionRequiredTimeOfFinal(Number(e.target.value));
                }}
              />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>初回予想技術スパイク時間</InputLabel>
              <OutlinedInput
                type="number"
                sx={{ width: "100px" }}
                inputProps={{
                  min: 0,
                }}
                value={predictionSurveyTimeOfFirst}
                disabled={!isEditing}
                onChange={(event) => {
                  setPredictionSurveyTimeOfFirst(Number(event.target.value));
                }}
              />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>最終予想技術スパイク時間</InputLabel>
              <OutlinedInput
                type="number"
                sx={{ width: "100px" }}
                inputProps={{
                  min: 0,
                }}
                value={predictionSurveyTimeOfFinal}
                onChange={(event) => {
                  setPredictionSurveyTimeOfFinal(Number(event.target.value));
                }}
                disabled={!isEditing}
              />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>調査内容</InputLabel>
              <TextField
                value={surveyDetail}
                disabled={!isEditing}
                variant="outlined"
                multiline
                onChange={(event) => {
                  setSurveyDetail(event.target.value);
                }}
              />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>完了日</InputLabel>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label={null}
                  value={
                    achievements.doneDate ? dayjs(achievements.doneDate) : null
                  }
                  disabled={true}
                />
              </LocalizationProvider>
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>調査時間</InputLabel>
              <TextField disabled={!isEditing} variant="outlined" multiline />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>実装時間</InputLabel>
              <TextField disabled={!isEditing} variant="outlined" multiline />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>結果考察</InputLabel>
              <TextField disabled={!isEditing} variant="outlined" multiline />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>課題</InputLabel>
              <TextField disabled={!isEditing} variant="outlined" multiline />
            </div>
            <div className={styles.taskColumn}>
              <InputLabel>改善点</InputLabel>
              <TextField disabled={!isEditing} variant="outlined" multiline />
            </div>
          </>
        )}
      </div>
      <TaskModal
        onSuccess={() => {
          onAddTasks(task.id, taskItems);
        }}
        isOpen={isModalOpen}
        onCloseModal={() => {
          setIsModalOpen(false);
        }}
      >
        <FormControl
          variant={"filled"}
          sx={{
            mt: 2,
            minWidth: 120,
            justifyContent: "flex-start",
            gap: 5, // 子要素間にスペースを持たせる
            width: "100%",
          }}
        >
          <div>
            <span>タイトル: </span>
            {task.title}
          </div>
          <div>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                if (taskItems.length > 0) {
                  const maxId = _.maxBy(taskItems, "id").id;
                  setTaskItems([
                    ...taskItems,
                    { id: maxId + 1, title: "", hour: 0 },
                  ]);
                } else {
                  setTaskItems([{ id: 0, title: "", hour: 0 }]);
                }
              }}
            >
              行追加
            </Button>
          </div>
          {taskItems.map((taskItem, index) => (
            <div key={index} style={{ display: "flex" }}>
              <TextField
                label="タイトル"
                variant="outlined"
                value={taskItem.title}
                onChange={(e) => {
                  console.log(e.target.value);
                  setTaskItems(
                    taskItems.map((item) => {
                      if (item.id == taskItem.id) {
                        return {
                          id: index,
                          title: e.target.value,
                          hour: taskItem.hour,
                        };
                      } else {
                        return item;
                      }
                    }),
                  );
                }}
              />
              <TextField
                label="完了予測時間"
                variant="outlined"
                type="number"
                sx={{ marginLeft: "50px" }}
                value={taskItem.hour}
                onChange={(e) => {
                  setTaskItems(
                    taskItems.map((item) => {
                      if (item.id == taskItem.id) {
                        return {
                          id: index,
                          title: taskItem.title,
                          hour: e.target.value,
                        };
                      } else {
                        return item;
                      }
                    }),
                  );
                }}
              />
              <Button
                sx={{ marginLeft: "30px" }}
                variant="contained"
                color="error"
                onClick={() => {
                  setTaskItems(
                    taskItems.filter((item) => taskItem.id != item.id),
                  );
                }}
              >
                削除
              </Button>
            </div>
          ))}
        </FormControl>
      </TaskModal>
    </div>
  );
};

export default Task;
