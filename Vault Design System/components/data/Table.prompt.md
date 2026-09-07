Dense data table with row hover — uploads list, admin users, activity log.

```jsx
<Table columns={[{key:'name',label:'File',mono:true},{key:'status',label:'Status',render:r=><StatusPill status={r.status}/>}]} rows={data} />
```
