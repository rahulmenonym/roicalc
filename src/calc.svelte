<script>
    let no_hrp = 5;
    let qpw = 20;
	let tpq = 30; 
	
	$: tot = no_hrp * qpw * tpq;
	$: hpw = Math.floor(tot/60)
	$: mpw = tot%60
	$: hpy = Math.round((tot*52)/60)
		
</script>

<div class="flex">

    <h1>
        Bumblebee ROI
    </h1>

    <div class="item">
		<div class="flex-container">
			<div class="flex-child">
				<label for="">Number of HR Professionals</label>
			</div>
			<div class="flex-child">
				<input type="number" bind:value={no_hrp} placeholder="5" inputmode="numeric">
				<input type=range bind:value={no_hrp} min=1 max=50 step=1>
			</div>
		</div>
        <br>
		<div class="flex-container">
			<div class="flex-child">
				<label for="">Number of HR Professionals</label>
			</div>
			<div class="flex-child">
				<input type="number" bind:value={qpw} placeholder="20" inputmode="numeric">
				<input type=range bind:value={qpw} min=1 max=100 step=2>
			</div>
		</div>
        <br>
		<div class="flex-container">
			<div class="flex-child">
				<label for="">Average time per query (in minutes)</label>
			</div>
			<div class="flex-child">
				<input type="number" bind:value={tpq} placeholder="30" inputmode="numeric">
        		<input type=range bind:value={tpq} min=0 max=180 step=5>	
			</div>
		</div>
        <br>

        
        <br>
       
    </div>
	<br>
	{#if ((no_hrp && qpw && tpq) && (hpw==1 && mpw==0))}
		<div class="result">
			You could be saving <b>{hpw} hour</b> a week <br>
			That's around <b> 52 </b> hours a year!
		</div>
	{:else if ((no_hrp && qpw && tpq)&& mpw == 0)}
		<div class="result">
			You could be saving <b>{hpw} hours</b> a week <br>
			That's around <b> {hpy} </b> hours a year!
		</div>
	{:else if ((no_hrp && qpw && tpq) && (hpw==0 && mpw>0))}
		<div class="result"> 
			You could be saving <b>{mpw} minutes</b> a week <br>
			That's around <b> {hpy} </b> hours a year!
		</div>
	{:else if ((no_hrp && qpw && tpq) && (hpw==1 && mpw>0))}
		<div class="result"> 
			You could be saving <b>1 hour and {mpw} minutes</b> a week <br>
			That's around <b> {hpy} </b> hours a year!
		</div>
	{:else if ((no_hrp && qpw && tpq) && (hpw>0 && mpw>0))}
		<div class="result">
			You could be saving <b>{hpw} hours and {mpw} minutes</b> a week <br>
			That's around <b> {hpy} </b> hours a year!
		</div>
	{/if}

</div>

<style>
	
	.flex {
		display:flex;
		flex-direction:column;
		justify-content: flex-start;
		align-items: center;
		height: 100vh
	}
	
	.item {
		max-width:500px;
		align-items: center;
	}
	
	label{
		margin-bottom:10px;
	}
	
	
	.flex-container {
    display: flex;
	}

	.flex-child {
		flex: 1;
	}  

	.result {
		font-size: large;
	}  
	
	
	input::placeholder {
		color:#ccc;
	}
</style>