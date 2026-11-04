/** Network clock estimate: prefer measured HTTP round trips to one-way SSE arrivals. */
export class RoomClock {
  offset=0;
  private calibrated=false;
  observe(serverNow:number,receivedAt:number,sentAt?:number) {
    if(sentAt===undefined) {if(!this.calibrated)this.offset=serverNow-receivedAt;return;}
    const latency=receivedAt-sentAt;
    if(latency<0||latency>5000)return;
    const estimate=serverNow-(sentAt+receivedAt)/2;
    this.offset=this.calibrated?this.offset*.7+estimate*.3:estimate;
    this.calibrated=true;
  }
}
