import { exec } from "child_process";
import { promisify } from "util";
import Redis from "ioredis";

const execAsync = promisify(exec);

export interface ContainerStats {
  name: string;
  cpuPercent: number;
  memoryUsage: string;
  memoryPercent: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface ResourceMetricsSnapshot {
  timestamp: number;
  containers: ContainerStats[];
  queue: QueueStats;
}

export interface AggregatedMetrics {
  apiCpuAvg: number;
  apiMemAvg: number;
  dbCpuAvg: number;
  dbMemAvg: number;
  redisCpuAvg: number;
  redisMemAvg: number;
  workerCpuAvg: number;
  workerMemAvg: number;
  queueWaitingMax: number;
  queueActiveMax: number;
}

export class ResourceMonitor {
  private intervalId?: NodeJS.Timeout;
  private snapshots: ResourceMetricsSnapshot[] = [];
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  public async start(intervalMs: number = 1000) {
    this.snapshots = [];
    this.intervalId = setInterval(async () => {
      try {
        const snapshot = await this.captureSnapshot();
        if (snapshot) {
          this.snapshots.push(snapshot);
        }
      } catch (err) {
        console.error("Failed to capture resource snapshot:", err);
      }
    }, intervalMs);
  }

  public async stop(): Promise<AggregatedMetrics> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    await this.redis.quit();
    return this.aggregate();
  }

  private async captureSnapshot(): Promise<ResourceMetricsSnapshot | null> {
    try {
      // 1. Docker Stats
      const { stdout } = await execAsync(`docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}'`);
      
      const containers = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, cpu, memStr, memPerc] = line.split("|");
          return {
            name,
            cpuPercent: parseFloat(cpu.replace("%", "")),
            memoryUsage: memStr.split(" / ")[0],
            memoryPercent: parseFloat(memPerc.replace("%", "")),
          };
        });

      // 2. Queue Stats (approximate, BullMQ structures)
      const prefix = "bull:media-queue";
      const waiting = await this.redis.llen(`${prefix}:wait`);
      const active = await this.redis.llen(`${prefix}:active`);
      const completed = await this.redis.zcard(`${prefix}:completed`);
      const failed = await this.redis.zcard(`${prefix}:failed`);

      return {
        timestamp: Date.now(),
        containers,
        queue: { waiting, active, completed, failed },
      };
    } catch (err) {
      return null;
    }
  }

  private aggregate(): AggregatedMetrics {
    if (this.snapshots.length === 0) {
      return {
        apiCpuAvg: 0, apiMemAvg: 0, dbCpuAvg: 0, dbMemAvg: 0,
        redisCpuAvg: 0, redisMemAvg: 0, workerCpuAvg: 0, workerMemAvg: 0,
        queueWaitingMax: 0, queueActiveMax: 0
      };
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

    const apiCpus = this.snapshots.map(s => {
      const apis = s.containers.filter(c => c.name.startsWith("gallery-api"));
      return apis.reduce((sum, c) => sum + c.cpuPercent, 0);
    });
    const apiMems = this.snapshots.map(s => {
      const apis = s.containers.filter(c => c.name.startsWith("gallery-api"));
      return apis.reduce((sum, c) => sum + c.memoryPercent, 0);
    });
    const dbCpus = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-db")?.cpuPercent || 0);
    const dbMems = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-db")?.memoryPercent || 0);
    const redisCpus = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-redis")?.cpuPercent || 0);
    const redisMems = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-redis")?.memoryPercent || 0);
    const workerCpus = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-worker")?.cpuPercent || 0);
    const workerMems = this.snapshots.map(s => s.containers.find(c => c.name === "gallery-worker")?.memoryPercent || 0);

    const queueWaiting = this.snapshots.map(s => s.queue.waiting);
    const queueActive = this.snapshots.map(s => s.queue.active);

    return {
      apiCpuAvg: Math.round(avg(apiCpus) * 100) / 100,
      apiMemAvg: Math.round(avg(apiMems) * 100) / 100,
      dbCpuAvg: Math.round(avg(dbCpus) * 100) / 100,
      dbMemAvg: Math.round(avg(dbMems) * 100) / 100,
      redisCpuAvg: Math.round(avg(redisCpus) * 100) / 100,
      redisMemAvg: Math.round(avg(redisMems) * 100) / 100,
      workerCpuAvg: Math.round(avg(workerCpus) * 100) / 100,
      workerMemAvg: Math.round(avg(workerMems) * 100) / 100,
      queueWaitingMax: max(queueWaiting),
      queueActiveMax: max(queueActive),
    };
  }
}
